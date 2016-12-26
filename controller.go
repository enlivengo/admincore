package admin

import (
	"crypto/md5"
	"fmt"
	"mime"
	"net/http"
	"path"
	"path/filepath"
	"strings"
	"time"

	"github.com/jinzhu/gorm"
	"github.com/qor/responder"
)

type Controller struct {
	*Admin
	action *Action
}

// HTTPUnprocessableEntity error status code
const HTTPUnprocessableEntity = 422

func (ac *Controller) Dashboard(context *Context) {
	context.Execute("dashboard", nil)
}

func (ac *Controller) Index(context *Context) {
	result, err := context.FindMany()
	context.AddError(err)

	responder.With("html", func() {
		context.Execute("index", result)
	}).With("json", func() {
		context.JSON("index", result)
	}).Respond(context.Request)
}

func (ac *Controller) SearchCenter(context *Context) {
	type Result struct {
		Context  *Context
		Resource *Resource
		Results  interface{}
	}
	var searchResults []Result

	for _, res := range context.Admin.GetSearchResources() {
		var (
			resourceName = context.Request.URL.Query().Get("resource_name")
			ctx          = context.clone().setResource(res)
			searchResult = Result{Context: ctx, Resource: res}
		)

		if resourceName == "" || res.ToParam() == resourceName {
			searchResult.Results, _ = ctx.FindMany()
		}
		searchResults = append(searchResults, searchResult)
	}
	context.Execute("search_center", searchResults)
}

func (ac *Controller) New(context *Context) {
	context.Execute("new", context.Resource.NewStruct())
}

func (ac *Controller) Create(context *Context) {
	res := context.Resource
	result := res.NewStruct()
	if context.AddError(res.Decode(context.Context, result)); !context.HasError() {
		context.AddError(res.CallSave(result, context.Context))
	}

	if context.HasError() {
		responder.With("html", func() {
			context.Writer.WriteHeader(HTTPUnprocessableEntity)
			context.Execute("new", result)
		}).With("json", func() {
			context.Writer.WriteHeader(HTTPUnprocessableEntity)
			context.JSON("index", map[string]interface{}{"errors": context.GetErrors()})
		}).Respond(context.Request)
	} else {
		responder.With("html", func() {
			context.Flash(string(context.t("qor_admin.form.successfully_created", "{{.Name}} was successfully created", res)), "success")
			http.Redirect(context.Writer, context.Request, context.URLFor(result, res), http.StatusFound)
		}).With("json", func() {
			context.JSON("show", result)
		}).Respond(context.Request)
	}
}

func (ac *Controller) Show(context *Context) {
	var result interface{}
	var err error

	// If singleton Resource
	if context.Resource.Config.Singleton {
		result = context.Resource.NewStruct()
		if err = context.Resource.CallFindMany(result, context.Context); err == gorm.ErrRecordNotFound {
			context.Execute("new", result)
			return
		}
	} else {
		result, err = context.FindOne()
	}
	context.AddError(err)

	responder.With("html", func() {
		context.Execute("show", result)
	}).With("json", func() {
		context.JSON("show", result)
	}).Respond(context.Request)
}

func (ac *Controller) Edit(context *Context) {
	result, err := context.FindOne()
	context.AddError(err)

	responder.With("html", func() {
		context.Execute("edit", result)
	}).With("json", func() {
		context.JSON("edit", result)
	}).Respond(context.Request)
}

func (ac *Controller) Update(context *Context) {
	var result interface{}
	var err error

	// If singleton Resource
	if context.Resource.Config.Singleton {
		result = context.Resource.NewStruct()
		context.Resource.CallFindMany(result, context.Context)
	} else {
		result, err = context.FindOne()
		context.AddError(err)
	}

	res := context.Resource
	if !context.HasError() {
		if context.AddError(res.Decode(context.Context, result)); !context.HasError() {
			context.AddError(res.CallSave(result, context.Context))
		}
	}

	if context.HasError() {
		context.Writer.WriteHeader(HTTPUnprocessableEntity)
		responder.With("html", func() {
			context.Execute("edit", result)
		}).With("json", func() {
			context.JSON("edit", map[string]interface{}{"errors": context.GetErrors()})
		}).Respond(context.Request)
	} else {
		responder.With("html", func() {
			context.FlashNow(string(context.t("qor_admin.form.successfully_updated", "{{.Name}} was successfully updated", res)), "success")
			context.Execute("show", result)
		}).With("json", func() {
			context.JSON("show", result)
		}).Respond(context.Request)
	}
}

func (ac *Controller) Delete(context *Context) {
	res := context.Resource
	status := http.StatusOK

	if context.AddError(res.CallDelete(res.NewStruct(), context.Context)); context.HasError() {
		context.Flash(string(context.t("qor_admin.form.failed_to_delete", "Failed to delete {{.Name}}", res)), "error")
		status = http.StatusNotFound
	}

	responder.With("html", func() {
		http.Redirect(context.Writer, context.Request, path.Join(ac.GetRouter().Prefix, res.ToParam()), http.StatusFound)
	}).With("json", func() {
		context.Writer.WriteHeader(status)
	}).Respond(context.Request)
}

func (ac *Controller) Action(context *Context) {
	var action = ac.action
	if context.Request.Method == "GET" {
		context.Execute("action", action)
	} else {
		var actionArgument = ActionArgument{
			PrimaryValues: context.Request.Form["primary_values[]"],
			Context:       context,
		}

		if primaryValue := context.Resource.GetPrimaryValue(context.Request); primaryValue != "" {
			actionArgument.PrimaryValues = append(actionArgument.PrimaryValues, primaryValue)
		}

		if action.Resource != nil {
			result := action.Resource.NewStruct()
			action.Resource.Decode(context.Context, result)
			actionArgument.Argument = result
		}

		err := action.Handle(&actionArgument)

		if !actionArgument.SkipDefaultResponse {
			if err == nil {
				message := string(context.t("qor_admin.actions.executed_successfully", "Action {{.Name}}: Executed successfully", action))
				responder.With("html", func() {
					context.Flash(message, "success")
					http.Redirect(context.Writer, context.Request, context.Request.Referer(), http.StatusFound)
				}).With("json", func() {
					context.JSON("OK", map[string]string{"message": message, "status": "ok"})
				}).Respond(context.Request)
			} else {
				context.Writer.WriteHeader(HTTPUnprocessableEntity)
				responder.With("html", func() {
					context.AddError(err)
					context.Execute("action", action)
				}).With("json", func() {
					message := string(context.t("qor_admin.actions.executed_failed", "Action {{.Name}}: Failed to execute", action))
					context.JSON("OK", map[string]string{"error": message, "status": "error"})
				}).Respond(context.Request)
			}
		}
	}
}

var (
	cacheSince = time.Now().Format(http.TimeFormat)
)

func (ac *Controller) Asset(context *Context) {
	file := strings.TrimPrefix(context.Request.URL.Path, ac.GetRouter().Prefix)

	if context.Request.Header.Get("If-Modified-Since") == cacheSince {
		context.Writer.WriteHeader(http.StatusNotModified)
		return
	} else {
		context.Writer.Header().Set("Last-Modified", cacheSince)
	}

	if content, err := context.Asset(file); err == nil {
		etag := fmt.Sprintf("%x", md5.Sum(content))
		if context.Request.Header.Get("If-None-Match") == etag {
			context.Writer.WriteHeader(http.StatusNotModified)
			return
		}

		if ctype := mime.TypeByExtension(filepath.Ext(file)); ctype != "" {
			context.Writer.Header().Set("Content-Type", ctype)
		}

		context.Writer.Header().Set("Cache-control", "private, must-revalidate, max-age=300")
		context.Writer.Header().Set("ETag", etag)
		context.Writer.Write(content)
	} else {
		http.NotFound(context.Writer, context.Request)
	}
}
