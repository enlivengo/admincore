package admin

import (
	"bytes"
	"encoding/json"
	"encoding/xml"
	"errors"
	"fmt"
	"html/template"
	"net/http"
	"path/filepath"
	"reflect"
	"strings"

	"github.com/jinzhu/inflection"
	"github.com/qor/qor"
	"github.com/qor/qor/utils"
	"github.com/qor/roles"
)

// Context admin context, which is used for admin controller
type Context struct {
	*qor.Context
	*Searcher
	Flashes  []Flash
	Resource *Resource
	Admin    *Admin
	Content  template.HTML
	Action   string
	Settings map[string]interface{}
	Result   interface{}

	funcMaps template.FuncMap
}

// NewContext new admin context
func (admin *Admin) NewContext(w http.ResponseWriter, r *http.Request) *Context {
	return &Context{Context: &qor.Context{Config: admin.Config, Request: r, Writer: w}, Admin: admin, Settings: map[string]interface{}{}}
}

// Funcs set FuncMap for templates
func (context *Context) Funcs(funcMaps template.FuncMap) *Context {
	if context.funcMaps == nil {
		context.funcMaps = template.FuncMap{}
	}

	for key, value := range funcMaps {
		context.funcMaps[key] = value
	}
	return context
}

func (context *Context) clone() *Context {
	return &Context{
		Context:  context.Context,
		Searcher: context.Searcher,
		Flashes:  context.Flashes,
		Resource: context.Resource,
		Admin:    context.Admin,
		Result:   context.Result,
		Content:  context.Content,
		Settings: context.Settings,
		Action:   context.Action,
		funcMaps: context.funcMaps,
	}
}

// Get get context's Settings
func (context *Context) Get(key string) interface{} {
	return context.Settings[key]
}

// Set set context's Settings
func (context *Context) Set(key string, value interface{}) {
	context.Settings[key] = value
}

func (context *Context) resourcePath() string {
	if context.Resource == nil {
		return ""
	}
	return context.Resource.ToParam()
}

func (context *Context) setResource(res *Resource) *Context {
	if res != nil {
		context.Resource = res
		context.ResourceID = res.GetPrimaryValue(context.Request)
	}
	context.Searcher = &Searcher{Context: context}
	return context
}

func (context *Context) Asset(layouts ...string) ([]byte, error) {
	var prefixes, themes []string

	if context.Request != nil {
		if theme := context.Request.URL.Query().Get("theme"); theme != "" {
			themes = append(themes, theme)
		}
	}

	if len(themes) == 0 && context.Resource != nil {
		for _, theme := range context.Resource.Config.Themes {
			themes = append(themes, theme.GetName())
		}
	}

	if resourcePath := context.resourcePath(); resourcePath != "" {
		for _, theme := range themes {
			prefixes = append(prefixes, filepath.Join("themes", theme, resourcePath))
		}
		prefixes = append(prefixes, resourcePath)
	}

	for _, theme := range themes {
		prefixes = append(prefixes, filepath.Join("themes", theme))
	}

	for _, layout := range layouts {
		for _, prefix := range prefixes {
			if content, err := context.Admin.AssetFS.Asset(filepath.Join(prefix, layout)); err == nil {
				return content, nil
			}
		}

		if content, err := context.Admin.AssetFS.Asset(layout); err == nil {
			return content, nil
		}
	}

	return []byte(""), fmt.Errorf("template not found: %v", layouts)
}

// renderText render text based on data
func (context *Context) renderText(text string, data interface{}) template.HTML {
	var (
		err    error
		tmpl   *template.Template
		result = bytes.NewBufferString("")
	)

	if tmpl, err = template.New("").Funcs(context.FuncMap()).Parse(text); err == nil {
		if err = tmpl.Execute(result, data); err == nil {
			return template.HTML(result.String())
		}
	}

	return template.HTML(err.Error())
}

// renderWith render template based on data
func (context *Context) renderWith(name string, data interface{}) template.HTML {
	var (
		err     error
		content []byte
	)

	if content, err = context.Asset(name + ".tmpl"); err == nil {
		return context.renderText(string(content), data)
	}
	return template.HTML(err.Error())
}

// Render render template based on context
func (context *Context) Render(name string, results ...interface{}) template.HTML {
	defer func() {
		if r := recover(); r != nil {
			err := errors.New(fmt.Sprintf("Get error when render file %v: %v", name, r))
			utils.ExitWithMsg(err)
		}
	}()

	clone := context.clone()
	if len(results) > 0 {
		clone.Result = results[0]
	}

	return clone.renderWith(name, clone)
}

// Execute execute template with layout
func (context *Context) Execute(name string, result interface{}) {
	var tmpl *template.Template

	if name == "show" && !context.Resource.isSetShowAttrs {
		name = "edit"
	}

	if context.Action == "" {
		context.Action = name
	}

	if content, err := context.Asset("layout.tmpl"); err == nil {
		if tmpl, err = template.New("layout").Funcs(context.FuncMap()).Parse(string(content)); err == nil {
			for _, name := range []string{"header", "footer"} {
				if tmpl.Lookup(name) == nil {
					if content, err := context.Asset(name + ".tmpl"); err == nil {
						tmpl.Parse(string(content))
					}
				} else {
					utils.ExitWithMsg(err)
				}
			}
		} else {
			utils.ExitWithMsg(err)
		}
	}

	context.Result = result
	context.Content = context.Render(name, result)
	if err := tmpl.Execute(context.Writer, context); err != nil {
		utils.ExitWithMsg(err)
	}
}

// JSON generate json outputs for action
func (context *Context) JSON(action string, result interface{}) {
	if action == "show" && !context.Resource.isSetShowAttrs {
		action = "edit"
	}

	js, err := json.MarshalIndent(context.Resource.convertObjectToJSONMap(context, result, action), "", "\t")
	if err != nil {
		result := make(map[string]string)
		result["error"] = err.Error()
		js, _ = json.Marshal(result)
	}

	context.Writer.Header().Set("Content-Type", "application/json")
	context.Writer.Write(js)
}

type XMLMarshaler struct {
	Action   string
	Resource *Resource
	Context  *Context
	Result   interface{}
}

func (xmlMarshaler XMLMarshaler) Initialize(value interface{}, res *Resource) XMLMarshaler {
	return XMLMarshaler{
		Resource: res,
		Action:   xmlMarshaler.Action,
		Context:  xmlMarshaler.Context,
		Result:   value,
	}
}

var DefaultXMLMarshalHandler = func(xmlMarshaler XMLMarshaler, e *xml.Encoder, start xml.StartElement) error {
	defaultStartElement := xml.StartElement{Name: xml.Name{Local: "XMLMarshaler"}}
	reflectValue := reflect.Indirect(reflect.ValueOf(xmlMarshaler.Result))
	res := xmlMarshaler.Resource
	context := xmlMarshaler.Context

	switch reflectValue.Kind() {
	case reflect.Map:
		// Write Start Element
		if start.Name.Local == defaultStartElement.Name.Local {
			start.Name.Local = "response"
		}

		if err := e.EncodeToken(start); err != nil {
			return err
		}

		mapKeys := reflectValue.MapKeys()
		for _, mapKey := range mapKeys {
			var (
				err       error
				mapValue  = reflectValue.MapIndex(mapKey)
				startElem = xml.StartElement{
					Name: xml.Name{Space: "", Local: fmt.Sprint(mapKey.Interface())},
					Attr: []xml.Attr{},
				}
			)

			mapValue = reflect.Indirect(reflect.ValueOf(mapValue.Interface()))
			if mapValue.Kind() == reflect.Map {
				err = e.EncodeElement(xmlMarshaler.Initialize(mapValue.Interface(), xmlMarshaler.Resource), startElem)
			} else {
				err = e.EncodeElement(fmt.Sprint(reflectValue.MapIndex(mapKey).Interface()), startElem)
			}

			if err != nil {
				return err
			}
		}
	case reflect.Slice:
		// Write Start Element
		if start.Name.Local == defaultStartElement.Name.Local {
			modelType := utils.ModelType(xmlMarshaler.Result)
			if xmlMarshaler.Resource != nil && modelType == utils.ModelType(xmlMarshaler.Resource.Value) {
				start.Name.Local = inflection.Plural(strings.Replace(xmlMarshaler.Resource.Name, " ", "", -1))
			} else {
				start.Name.Local = "responses"
			}
		}

		if err := e.EncodeToken(start); err != nil {
			return err
		}

		for i := 0; i < reflectValue.Len(); i++ {
			if err := e.EncodeElement(xmlMarshaler.Initialize(reflect.Indirect(reflectValue.Index(i)).Interface(), xmlMarshaler.Resource), defaultStartElement); err != nil {
				return err
			}
		}
	case reflect.Struct:
		// Write Start Element
		if xmlMarshaler.Resource == nil || utils.ModelType(xmlMarshaler.Result) != utils.ModelType(xmlMarshaler.Resource.Value) {
			if err := e.EncodeElement(fmt.Sprint(xmlMarshaler.Result), start); err != nil {
				return err
			}
		} else {
			if start.Name.Local == defaultStartElement.Name.Local {
				start.Name.Local = strings.Replace(xmlMarshaler.Resource.Name, " ", "", -1)
			}

			if err := e.EncodeToken(start); err != nil {
				return err
			}

			metas := []*Meta{}
			switch xmlMarshaler.Action {
			case "index":
				metas = res.ConvertSectionToMetas(res.allowedSections(res.IndexAttrs(), context, roles.Update))
			case "edit":
				metas = res.ConvertSectionToMetas(res.allowedSections(res.EditAttrs(), context, roles.Update))
			case "show":
				metas = res.ConvertSectionToMetas(res.allowedSections(res.ShowAttrs(), context, roles.Read))
			}

			for _, meta := range metas {
				if meta.HasPermission(roles.Read, context.Context) {
					metaStart := xml.StartElement{
						Name: xml.Name{
							Space: "",
							Local: strings.Replace(meta.Label, " ", "", -1),
						},
					}

					// has_one, has_many checker to avoid dead loop
					if meta.Resource != nil && (meta.FieldStruct != nil && meta.FieldStruct.Relationship != nil && (meta.FieldStruct.Relationship.Kind == "has_one" || meta.FieldStruct.Relationship.Kind == "has_many")) {
						if err := e.EncodeElement(xmlMarshaler.Initialize(context.RawValueOf(xmlMarshaler.Result, meta), meta.Resource), metaStart); err != nil {
							return err
						}
					} else {
						if err := e.EncodeElement(context.FormattedValueOf(xmlMarshaler.Result, meta), metaStart); err != nil {
							return err
						}
					}
				}
			}
		}
	default:
		if reflectValue.IsValid() {
			if err := e.EncodeElement(fmt.Sprint(reflectValue.Interface()), start); err != nil {
				return err
			}
		} else {
			return nil
		}
	}

	// Write End Element
	if err := e.EncodeToken(xml.EndElement{Name: start.Name}); err != nil {
		return err
	}
	return nil
}

func (xmlMarshaler XMLMarshaler) MarshalXML(e *xml.Encoder, start xml.StartElement) error {
	return DefaultXMLMarshalHandler(xmlMarshaler, e, start)
}

// XML generate xml outputs for action
func (context *Context) XML(action string, result interface{}) {
	if action == "show" && !context.Resource.isSetShowAttrs {
		action = "edit"
	}

	xmlMarshaler := XMLMarshaler{
		Action:   action,
		Resource: context.Resource,
		Context:  context,
		Result:   result,
	}

	xmlMarshalResult, err := xml.MarshalIndent(xmlMarshaler, "", "\t")

	if err != nil {
		xmlMarshaler.Result = map[string]string{"error": err.Error()}
		xmlMarshalResult, _ = xml.MarshalIndent(xmlMarshaler, "", "\t")
	}

	context.Writer.Header().Set("Content-Type", "application/xml")
	context.Writer.Write([]byte(xml.Header + string(xmlMarshalResult)))
}
