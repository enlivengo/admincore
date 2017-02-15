package admin

import (
	"encoding/json"
	"io"
	"path"
	"reflect"

	"github.com/qor/roles"
)

type JSONEncoding struct{}

func (JSONEncoding) CouldEncode(encoder Encoder) bool {
	if encoder.Context != nil && encoder.Context.Request != nil {
		if path.Ext(encoder.Context.Request.URL.Path) == ".json" {
			return true
		}

		for _, typ := range getAcceptMimeTypes(encoder.Context.Request) {
			if typ == ".json" {
				return true
			}
		}
	}

	return false
}

func (JSONEncoding) Encode(writer io.Writer, encoder Encoder) error {
	context := encoder.Context

	js, err := json.MarshalIndent(context.Resource.convertObjectToJSONMap(context, encoder.Result, encoder.Action), "", "\t")
	if err != nil {
		result := make(map[string]string)
		result["error"] = err.Error()
		js, _ = json.Marshal(result)
	}

	_, err = context.Writer.Write(js)
	return err
}

func (res *Resource) convertObjectToJSONMap(context *Context, value interface{}, kind string) interface{} {
	reflectValue := reflect.ValueOf(value)
	for reflectValue.Kind() == reflect.Ptr {
		reflectValue = reflectValue.Elem()
	}

	switch reflectValue.Kind() {
	case reflect.Slice:
		values := []interface{}{}
		for i := 0; i < reflectValue.Len(); i++ {
			if reflectValue.Index(i).Kind() == reflect.Ptr {
				values = append(values, res.convertObjectToJSONMap(context, reflectValue.Index(i).Interface(), kind))
			} else {
				values = append(values, res.convertObjectToJSONMap(context, reflectValue.Index(i).Addr().Interface(), kind))
			}
		}
		return values
	case reflect.Struct:
		var metas []*Meta
		if kind == "index" {
			metas = res.ConvertSectionToMetas(res.allowedSections(res.IndexAttrs(), context, roles.Update))
		} else if kind == "edit" {
			metas = res.ConvertSectionToMetas(res.allowedSections(res.EditAttrs(), context, roles.Update))
		} else if kind == "show" {
			metas = res.ConvertSectionToMetas(res.allowedSections(res.ShowAttrs(), context, roles.Read))
		}

		values := map[string]interface{}{}
		for _, meta := range metas {
			if meta.HasPermission(roles.Read, context.Context) {
				// has_one, has_many checker to avoid dead loop
				if meta.Resource != nil && (meta.FieldStruct != nil && meta.FieldStruct.Relationship != nil && (meta.FieldStruct.Relationship.Kind == "has_one" || meta.FieldStruct.Relationship.Kind == "has_many")) {
					values[meta.GetName()] = meta.Resource.convertObjectToJSONMap(context, context.RawValueOf(value, meta), kind)
				} else {
					values[meta.GetName()] = context.FormattedValueOf(value, meta)
				}
			}
		}
		return values
	default:
		return value
	}
}
