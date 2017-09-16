package admincore

import (
	"log"
	"net/http"
	"net/url"
	"path"
	"regexp"
	"sort"
	"strings"
	"time"

	"github.com/enlivengo/enliven"
	"github.com/qor/qor"
	"github.com/qor/qor/utils"
	"github.com/qor/roles"
)

// Middleware is a way to filter a request and response coming into your application
// Register new middleware with `admin.GetRouter().Use(Middleware{
//   Name: "middleware name", // use middleware with same name will overwrite old one
//   Handler: func(*Context, *Middleware) {
//     // do something
//     // run next middleware
//     middleware.Next(context)
//   },
// })`
// It will be called in order, it need to be registered before `admin.MountTo`
type Middleware struct {
	Name    string
	Handler func(*Context, *Middleware)
	next    *Middleware
}

// Next will call the next middleware
func (middleware Middleware) Next(context *Context) {
	if next := middleware.next; next != nil {
		next.Handler(context, next)
	}
}

// Router contains registered routers
type Router struct {
	Prefix      string
	routers     map[string][]*routeHandler
	middlewares []*Middleware
}

func newRouter() *Router {
	return &Router{routers: map[string][]*routeHandler{
		"GET":    {},
		"PUT":    {},
		"POST":   {},
		"DELETE": {},
	}}
}

// Use reigster a middleware to the router
func (r *Router) Use(middleware *Middleware) {
	// compile middleware
	for index, m := range r.middlewares {
		// replace middleware have same name
		if m.Name == middleware.Name {
			middleware.next = m.next
			r.middlewares[index] = middleware
			if index > 1 {
				r.middlewares[index-1].next = middleware
			}
			return
		} else if len(r.middlewares) > index+1 {
			m.next = r.middlewares[index+1]
		} else if len(r.middlewares) == index+1 {
			m.next = middleware
		}
	}

	r.middlewares = append(r.middlewares, middleware)
}

// GetMiddleware get registered middleware
func (r *Router) GetMiddleware(name string) *Middleware {
	for _, middleware := range r.middlewares {
		if middleware.Name == name {
			return middleware
		}
	}
	return nil
}

var wildcardRouter = regexp.MustCompile(`/:\w+`)

func (r *Router) sortRoutes(routes []*routeHandler) {
	sort.SliceStable(routes, func(i, j int) bool {
		iIsWildcard := wildcardRouter.MatchString(routes[i].Path)
		jIsWildcard := wildcardRouter.MatchString(routes[j].Path)
		// i regexp (true), j static (false) => false
		// i static (true), j regexp (true) => true
		if iIsWildcard != jIsWildcard {
			return jIsWildcard
		}
		return len(routes[i].Path) > len(routes[j].Path)
	})
}

// Get register a GET request handle with the given path
func (r *Router) Get(path string, handle requestHandler, config ...*RouteConfig) {
	r.routers["GET"] = append(r.routers["GET"], newRouteHandler(path, handle, config...))
	r.sortRoutes(r.routers["GET"])
}

// Post register a POST request handle with the given path
func (r *Router) Post(path string, handle requestHandler, config ...*RouteConfig) {
	r.routers["POST"] = append(r.routers["POST"], newRouteHandler(path, handle, config...))
	r.sortRoutes(r.routers["POST"])
}

// Put register a PUT request handle with the given path
func (r *Router) Put(path string, handle requestHandler, config ...*RouteConfig) {
	r.routers["PUT"] = append(r.routers["PUT"], newRouteHandler(path, handle, config...))
	r.sortRoutes(r.routers["PUT"])
}

// Delete register a DELETE request handle with the given path
func (r *Router) Delete(path string, handle requestHandler, config ...*RouteConfig) {
	r.routers["DELETE"] = append(r.routers["DELETE"], newRouteHandler(path, handle, config...))
	r.sortRoutes(r.routers["DELETE"])
}

// MountTo mount the service into mux (HTTP request multiplexer) with given path
func (admin *Admin) MountTo(mountTo string) {
	prefix := "/" + strings.Trim(mountTo, "/")
	serveMux := admin.NewServeMux(prefix)
	admin.Enliven.AddRoute(prefix+"...", serveMux.ServeHTTP)
}

// NewServeMux generate http.Handler for admin
func (admin *Admin) NewServeMux(prefix string) *ServeMux {
	// Register default routes & middlewares
	router := admin.router
	router.Prefix = prefix

	adminController := &Controller{Admin: admin}
	router.Get("", adminController.Dashboard)
	router.Get("/!search", adminController.SearchCenter)

	browserUserAgentRegexp := regexp.MustCompile("Mozilla|Gecko|WebKit|MSIE|Opera")
	router.Use(&Middleware{
		Name: "csrf_check",
		Handler: func(context *Context, middleware *Middleware) {
			request := context.Request
			if request.Method != "GET" {
				if browserUserAgentRegexp.MatchString(request.UserAgent()) {
					if referrer := request.Referer(); referrer != "" {
						if r, err := url.Parse(referrer); err == nil {
							if r.Host == request.Host {
								middleware.Next(context)
								return
							}
						}
					}
					context.Writer.Write([]byte("Could not authorize you because 'CSRF detected'"))
					return
				}
			}

			middleware.Next(context)
		},
	})

	router.Use(&Middleware{
		Name: "qor_handler",
		Handler: func(context *Context, middleware *Middleware) {
			context.Writer.Header().Set("Cache-control", "no-store")
			context.Writer.Header().Set("Pragma", "no-cache")
			if context.RouteHandler != nil {
				context.RouteHandler.Handle(context)
				return
			}
			http.NotFound(context.Writer, context.Request)
		},
	})

	return &ServeMux{admin: admin}
}

// RegisterResourceRouters register resource to router
func (admin *Admin) RegisterResourceRouters(res *Resource, actions ...string) {
	var (
		primaryKeyParams = res.ParamIDName()
		adminController  = &Controller{Admin: admin}
	)

	for _, action := range actions {
		switch strings.ToLower(action) {
		case "create":
			if !res.Config.Singleton {
				// New
				res.RegisterRoute("GET", "/new", adminController.New, &RouteConfig{PermissionMode: roles.Create})
			}

			// Create
			res.RegisterRoute("POST", "/", adminController.Create, &RouteConfig{PermissionMode: roles.Create})
		case "update":
			if res.Config.Singleton {
				// Edit
				res.RegisterRoute("GET", "/edit", adminController.Edit, &RouteConfig{PermissionMode: roles.Update})

				// Update
				res.RegisterRoute("PUT", "/", adminController.Update, &RouteConfig{PermissionMode: roles.Update})
			} else {
				// Edit
				res.RegisterRoute("GET", path.Join(primaryKeyParams, "edit"), adminController.Edit, &RouteConfig{PermissionMode: roles.Update})

				// Update
				res.RegisterRoute("POST", primaryKeyParams, adminController.Update, &RouteConfig{PermissionMode: roles.Update})
				res.RegisterRoute("PUT", primaryKeyParams, adminController.Update, &RouteConfig{PermissionMode: roles.Update})
			}
		case "read":
			if res.Config.Singleton {
				// Index
				res.RegisterRoute("GET", "/", adminController.Show, &RouteConfig{PermissionMode: roles.Read})
			} else {
				// Index
				res.RegisterRoute("GET", "/", adminController.Index, &RouteConfig{PermissionMode: roles.Read})

				// Show
				res.RegisterRoute("GET", primaryKeyParams, adminController.Show, &RouteConfig{PermissionMode: roles.Read})
			}
		case "delete":
			if !res.Config.Singleton {
				// Delete
				res.RegisterRoute("DELETE", primaryKeyParams, adminController.Delete, &RouteConfig{PermissionMode: roles.Delete})
			}
		}
	}

	isValidSubResource := func(r *Resource) bool {
		if r == nil || r.ParentResource == nil {
			return false
		}

		modelType := utils.ModelType(r.Value)
		for r.ParentResource != nil {
			// don't register same resource as nested routes
			if utils.ModelType(r.ParentResource.Value) == modelType {
				return false
			}
			r = r.ParentResource
		}
		return true
	}

	// Register Sub Resources
	if len(res.PrimaryFields) > 0 {
		for _, meta := range res.ConvertSectionToMetas(res.NewAttrs()) {
			if meta.FieldStruct != nil && meta.FieldStruct.Relationship != nil && isValidSubResource(meta.Resource) {
				if len(meta.Resource.newSections) > 0 {
					admin.RegisterResourceRouters(meta.Resource, "create")
				}
			}
		}

		for _, meta := range res.ConvertSectionToMetas(res.ShowAttrs()) {
			if meta.FieldStruct != nil && meta.FieldStruct.Relationship != nil && isValidSubResource(meta.Resource) {
				if len(meta.Resource.showSections) > 0 {
					admin.RegisterResourceRouters(meta.Resource, "read")
				}
			}
		}

		for _, meta := range res.ConvertSectionToMetas(res.EditAttrs()) {
			if meta.FieldStruct != nil && meta.FieldStruct.Relationship != nil && isValidSubResource(meta.Resource) {
				if len(meta.Resource.editSections) > 0 {
					admin.RegisterResourceRouters(meta.Resource, "update", "delete")
				}
			}
		}
	}
}

// RegisterRoute register route
func (res *Resource) RegisterRoute(method string, relativePath string, handler requestHandler, config *RouteConfig) {
	if config == nil {
		config = &RouteConfig{}
	}
	config.Resource = res

	var (
		prefix string
		param  = res.ToParam()
		router = res.GetAdmin().router
	)

	if prefix = func(r *Resource) string {
		currentParam := param

		for r.ParentResource != nil {
			parentPath := r.ParentResource.ToParam()
			// don't register same resource as nested routes
			if parentPath == param {
				return ""
			}
			currentParam = path.Join(parentPath, r.ParentResource.ParamIDName(), currentParam)
			r = r.ParentResource
		}
		return "/" + strings.Trim(currentParam, "/")
	}(res); prefix == "" {
		return
	}

	switch strings.ToUpper(method) {
	case "GET":
		router.Get(path.Join(prefix, relativePath), handler, config)
	case "POST":
		router.Post(path.Join(prefix, relativePath), handler, config)
	case "PUT":
		router.Put(path.Join(prefix, relativePath), handler, config)
	case "DELETE":
		router.Delete(path.Join(prefix, relativePath), handler, config)
	}
}

// ServeMux is used to serve the admin pages
type ServeMux struct {
	admin *Admin
}

// ServeHTTP dispatches the handler registered in the matched route
func (serveMux *ServeMux) ServeHTTP(ctx *enliven.Context) {
	if !ctx.Enliven.Auth.HasPermission("admin-app", ctx) {
		ctx.Forbidden()
		return
	} // w req

	var (
		admin        = serveMux.admin
		RelativePath = "/" + strings.Trim(strings.TrimPrefix(ctx.Request.URL.Path, admin.router.Prefix), "/")
		context      = admin.NewContext(ctx.Response, ctx.Request)
	)

	// Parse Request Form
	ctx.Request.ParseMultipartForm(2 * 1024 * 1024)

	// Set Request Method
	if method := ctx.Request.Form.Get("_method"); method != "" {
		ctx.Request.Method = strings.ToUpper(method)
	}

	if regexp.MustCompile("^/assets/.*$").MatchString(RelativePath) && strings.ToUpper(ctx.Request.Method) == "GET" {
		(&Controller{Admin: admin}).Asset(context)
		return
	}

	defer func() func() {
		begin := time.Now()
		return func() {
			log.Printf("Finish [%s] %s Took %.2fms\n", ctx.Request.Method, ctx.Request.RequestURI, time.Now().Sub(begin).Seconds()*1000)
		}
	}()()

	// Set Current User
	var currentUser qor.CurrentUser
	var permissionMode roles.PermissionMode
	if admin.Auth != nil {
		if currentUser = admin.Auth.GetCurrentUser(context); currentUser == nil {
			http.Redirect(ctx.Response, ctx.Request, admin.Auth.LoginURL(context), http.StatusSeeOther)
			return
		}
		context.CurrentUser = currentUser
		context.SetDB(context.GetDB().Set("qor:current_user", context.CurrentUser))
	}
	context.Roles = roles.MatchedRoles(ctx.Request, currentUser)

	switch ctx.Request.Method {
	case "GET":
		permissionMode = roles.Read
	case "PUT":
		permissionMode = roles.Update
	case "POST":
		permissionMode = roles.Create
	case "DELETE":
		permissionMode = roles.Delete
	}

	handlers := admin.router.routers[strings.ToUpper(ctx.Request.Method)]
	for _, handler := range handlers {
		if params, _, ok := utils.ParamsMatch(handler.Path, RelativePath); ok && handler.HasPermission(permissionMode, context.Context) {
			if len(params) > 0 {
				ctx.Request.URL.RawQuery = url.Values(params).Encode() + "&" + ctx.Request.URL.RawQuery
			}
			context.RouteHandler = handler

			context.setResource(handler.Config.Resource)
			if context.Resource == nil {
				if matches := regexp.MustCompile(path.Join(admin.router.Prefix, `([^/]+)`)).FindStringSubmatch(ctx.Request.URL.Path); len(matches) > 1 {
					context.setResource(admin.GetResource(matches[1]))
				}
			}
			break
		}
	}

	// Call first middleware
	for _, middleware := range admin.router.middlewares {
		middleware.Handler(context, middleware)
		break
	}
}
