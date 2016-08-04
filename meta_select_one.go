package admin

import (
	"errors"
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
	SelectionTemplate  string
	SelectMode         string // select2, select2_remote, bottom_sheet
	RemoteDataResource *Resource
	RemoteDataURL      string
	metaConfig
	getCollection func(interface{}, *Context) [][]string
}

// GetTemplate get template for selection template
func (selectOneConfig SelectOneConfig) GetTemplate(context *Context, metaType string) ([]byte, error) {
	if metaType == "form" && selectOneConfig.SelectionTemplate != "" {
		return context.Asset(selectOneConfig.SelectionTemplate)
	}
	return nil, errors.New("not implemented")
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
		meta.Type = "select_one"

		// Set GetCollection
		if selectOneConfig.Collection != nil {
			selectOneConfig.SelectMode = "select2"

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
		}

		// Set GetCollection if normal select2 mode
		if selectOneConfig.getCollection == nil {
			if selectOneConfig.RemoteDataResource == nil {
				fieldType := meta.FieldStruct.Struct.Type
				selectOneConfig.RemoteDataResource = meta.baseResource.GetAdmin().NewResource(reflect.New(fieldType))
			}

			if selectOneConfig.SelectMode == "select2" {
				selectOneConfig.getCollection = func(_ interface{}, context *Context) (results [][]string) {
					cloneContext := context.clone()
					cloneContext.setResource(selectOneConfig.RemoteDataResource)
					searcher := &Searcher{Context: cloneContext}
					searchResults, _ := searcher.FindMany()

					reflectValues := reflect.Indirect(reflect.ValueOf(searchResults))
					for i := 0; i < reflectValues.Len(); i++ {
						value := reflectValues.Index(i).Interface()
						scope := context.GetDB().NewScope(value)
						results = append(results, []string{fmt.Sprint(scope.PrimaryKeyValue()), utils.Stringify(value)})
					}
					return
				}
			} else if selectOneConfig.SelectMode == "" {
				selectOneConfig.SelectMode = "select2_remote"
			}
		}

		if selectOneConfig.SelectMode == "select2_remote" || selectOneConfig.SelectMode == "bottom_sheet" {
			if remoteDataResource := selectOneConfig.RemoteDataResource; remoteDataResource != nil {
				baseResource := meta.GetBaseResource().(*Resource)
				Admin := baseResource.GetAdmin()

				remoteDataSearcherController := &controller{Admin: Admin}
				remoteDataSearcherPrefix := fmt.Sprintf("!remote_data_searcher/%v/%v", baseResource.ToParam(), meta.GetName())
				selectOneConfig.RemoteDataURL = remoteDataSearcherPrefix
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
			} else {
				utils.ExitWithMsg("RemoteDataResource not configured for meta %v", meta.Name)
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
