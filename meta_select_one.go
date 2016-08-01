package admin

import (
	"fmt"
	"path"
	"reflect"

	"github.com/qor/qor"
	"github.com/qor/qor/resource"
	"github.com/qor/qor/utils"
)

// SelectOneConfig meta configuration used for select one
type SelectOneConfig struct {
	Collection         interface{} // []string, [][]string, func(interface{}, *qor.Context) [][]string, func(interface{}, *admin.Context) [][]string
	AllowBlank         bool
	Template           string
	RemoteDataResource *Resource
	getCollection      func(interface{}, *Context) [][]string
}

// GetCollection get collections from select one meta
func (selectOneConfig SelectOneConfig) GetCollection(value interface{}, context *Context) [][]string {
	if selectOneConfig.getCollection != nil {
		return selectOneConfig.getCollection(value, context)
	}
	return [][]string{}
}

// ConfigureQorMeta configure select one meta
func (selectOneConfig *SelectOneConfig) ConfigureQorMeta(metaor resource.Metaor) {
	if meta, ok := metaor.(*Meta); ok {
		if remoteDataResource := selectOneConfig.RemoteDataResource; remoteDataResource != nil {
			baseResource := meta.GetBaseResource().(*Resource)
			Admin := baseResource.GetAdmin()

			remoteDataResource.Meta(&Meta{Name: "SelectorPrimaryKey", Valuer: func(record interface{}, context *qor.Context) interface{} {
				return context.GetDB().NewScope(record).PrimaryKeyValue()
			}})

			remoteDataResource.Meta(&Meta{Name: "SelectorHumanizeString", Valuer: func(record interface{}, context *qor.Context) interface{} {
				return utils.Stringify(record)
			}})

			remoteDataResource.IndexAttrs("SelectorPrimaryKey", "SelectorHumanizeString", remoteDataResource.IndexAttrs())

			remoteDataSearcherController := &controller{Admin: Admin}
			remoteDataSearcherPrefix := fmt.Sprintf("!remote_data_searcher/%v/%v", baseResource.ToParam(), meta.GetName())
			// GET /admin/!meta_selector/:resource_name/:field_name?keyword=:keyword
			Admin.GetRouter().Get(remoteDataSearcherPrefix, remoteDataSearcherController.Index, RouteConfig{
				Resource: remoteDataResource,
			})

			// POST /admin/!meta_selector/:resource_name/:field_name
			Admin.GetRouter().Post(remoteDataSearcherPrefix, remoteDataSearcherController.Create, RouteConfig{
				Resource: remoteDataResource,
			})

			// GET /admin/!meta_selector/:resource_name/:field_name/new
			Admin.GetRouter().Get(path.Join(remoteDataSearcherPrefix, "new"), remoteDataSearcherController.New, RouteConfig{
				Resource: remoteDataResource,
			})
		}

		meta.Type = "select_one"

		// Set GetCollection
		if selectOneConfig.Collection != nil {
			if values, ok := selectOneConfig.Collection.([]string); ok {
				selectOneConfig.getCollection = func(interface{}, *Context) (results [][]string) {
					for _, value := range values {
						results = append(results, []string{value, value})
					}
					return
				}
			} else if maps, ok := selectOneConfig.Collection.([][]string); ok {
				selectOneConfig.getCollection = func(interface{}, *Context) [][]string {
					return maps
				}
			} else if fc, ok := selectOneConfig.Collection.(func(interface{}, *qor.Context) [][]string); ok {
				selectOneConfig.getCollection = func(record interface{}, context *Context) [][]string {
					return fc(record, context.Context)
				}
			} else if fc, ok := selectOneConfig.Collection.(func(interface{}, *Context) [][]string); ok {
				selectOneConfig.getCollection = fc
			} else {
				utils.ExitWithMsg("Unsupported Collection format for meta %v of resource %v", meta.Name, reflect.TypeOf(meta.baseResource.Value))
			}
		} else if selectOneConfig.getCollection == nil {
			selectOneConfig.getCollection = func(_ interface{}, context *Context) (results [][]string) {
				fieldType := meta.FieldStruct.Struct.Type
				for fieldType.Kind() == reflect.Ptr || fieldType.Kind() == reflect.Slice {
					fieldType = fieldType.Elem()
				}
				values := reflect.New(reflect.SliceOf(fieldType)).Interface()
				context.GetDB().Find(values)

				reflectValues := reflect.Indirect(reflect.ValueOf(values))
				for i := 0; i < reflectValues.Len(); i++ {
					value := reflectValues.Index(i).Interface()
					scope := context.GetDB().NewScope(value)
					results = append(results, []string{fmt.Sprint(scope.PrimaryKeyValue()), utils.Stringify(value)})
				}
				return
			}
		}

		// Set FormattedValuer
		if meta.FormattedValuer == nil {
			meta.SetFormattedValuer(func(record interface{}, context *qor.Context) interface{} {
				return utils.Stringify(meta.GetValuer()(record, context))
			})
		}
	}
}
