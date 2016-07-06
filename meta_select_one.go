package admin

import (
	"fmt"
	"reflect"

	"github.com/qor/qor"
	"github.com/qor/qor/resource"
	"github.com/qor/qor/utils"
)

// SelectOneConfig meta configuration used for select one
type SelectOneConfig struct {
	Collection    interface{}
	getCollection func(interface{}, *qor.Context) [][]string
}

// GetCollection get collections from select one meta
func (selectOneConfig SelectOneConfig) GetCollection(value interface{}, context *qor.Context) [][]string {
	if selectOneConfig.getCollection != nil {
		return selectOneConfig.getCollection(value, context)
	}
	return [][]string{}
}

// ConfigureQorMeta configure select one meta
func (selectOneConfig *SelectOneConfig) ConfigureQorMeta(metaor resource.Metaor) {
	if meta, ok := metaor.(*Meta); ok {
		meta.Type = "select_one"

		// Set GetCollection
		if meta.Collection != nil {
			if values, ok := meta.Collection.([]string); ok {
				selectOneConfig.getCollection = func(interface{}, *qor.Context) (results [][]string) {
					for _, value := range values {
						results = append(results, []string{value, value})
					}
					return
				}
			} else if maps, ok := meta.Collection.([][]string); ok {
				selectOneConfig.getCollection = func(interface{}, *qor.Context) [][]string {
					return maps
				}
			} else if f, ok := meta.Collection.(func(interface{}, *qor.Context) [][]string); ok {
				selectOneConfig.getCollection = f
			} else {
				utils.ExitWithMsg("Unsupported Collection format for meta %v of resource %v", meta.Name, reflect.TypeOf(meta.baseResource.Value))
			}
		} else if selectOneConfig.getCollection == nil {
			selectOneConfig.getCollection = func(_ interface{}, context *qor.Context) (results [][]string) {
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
