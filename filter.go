package admin

import (
	"fmt"
	"reflect"
	"strconv"
	"strings"
	"time"

	"github.com/jinzhu/gorm"
	"github.com/jinzhu/now"
	"github.com/qor/qor"
	"github.com/qor/qor/resource"
)

// Filter register filter for qor resource
func (res *Resource) Filter(filter *Filter) {
	res.filters[filter.Name] = filter

	if filter.Handler == nil {
		// generate default handler
		filter.Handler = func(db *gorm.DB, filterArgument *FilterArgument) *gorm.DB {
			if metaValue := filterArgument.Value.Get("Value"); metaValue != nil {
				var (
					scope     = db.NewScope(res.Value)
					tableName = scope.TableName()
					keyword   = fmt.Sprint(metaValue.Value)
				)

				if field, ok := scope.FieldByName(filter.Name); ok {
					var conditions []string
					var keywords []interface{}

					switch field.Field.Kind() {
					case reflect.String:
						conditions = append(conditions, fmt.Sprintf("upper(%v.%v) like upper(?)", tableName, scope.Quote(field.DBName)))
						keywords = append(keywords, "%"+keyword+"%")
					case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64, reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64:
						if _, err := strconv.Atoi(keyword); err == nil {
							conditions = append(conditions, fmt.Sprintf("%v.%v = ?", tableName, scope.Quote(field.DBName)))
							keywords = append(keywords, keyword)
						}
					case reflect.Float32, reflect.Float64:
						if _, err := strconv.ParseFloat(keyword, 64); err == nil {
							conditions = append(conditions, fmt.Sprintf("%v.%v = ?", tableName, scope.Quote(field.DBName)))
							keywords = append(keywords, keyword)
						}
					case reflect.Bool:
						if value, err := strconv.ParseBool(keyword); err == nil {
							conditions = append(conditions, fmt.Sprintf("%v.%v = ?", tableName, scope.Quote(field.DBName)))
							keywords = append(keywords, value)
						}
					case reflect.Struct:
						// time ?
						if _, ok := field.Field.Interface().(time.Time); ok {
							if parsedTime, err := now.Parse(keyword); err == nil {
								conditions = append(conditions, fmt.Sprintf("%v.%v = ?", tableName, scope.Quote(field.DBName)))
								keywords = append(keywords, parsedTime)
							}
						}
					case reflect.Ptr:
						// time ?
						if _, ok := field.Field.Interface().(*time.Time); ok {
							if parsedTime, err := now.Parse(keyword); err == nil {
								conditions = append(conditions, fmt.Sprintf("%v.%v = ?", tableName, scope.Quote(field.DBName)))
								keywords = append(keywords, parsedTime)
							}
						}
					default:
						conditions = append(conditions, fmt.Sprintf("%v.%v = ?", tableName, scope.Quote(field.DBName)))
						keywords = append(keywords, keyword)
					}

					// search conditions
					if len(conditions) > 0 {
						return db.Where(strings.Join(conditions, " OR "), keywords...)
					}
				}
			}
			return db
		}
	}
}

// FilterArgument filter argument that used in handler
type FilterArgument struct {
	Value    *resource.MetaValues
	Resource *Resource
	Context  *qor.Context
}

// Filter filter definiation
type Filter struct {
	Name    string
	Label   string
	Type    string
	Handler func(*gorm.DB, *FilterArgument) *gorm.DB
	Config  MetaConfigInterface
}

var defaultFilterHandler = func(name string, value string, scope *gorm.DB, context *qor.Context) *gorm.DB {
	lastIndex := strings.LastIndex(name, "_")
	operation := name[lastIndex+1:]
	column := name[0:lastIndex]

	switch operation {
	case "cont":
		return scope.Where(fmt.Sprintf("%v ILIKE ?", scope.NewScope(nil).Quote(column)), "%"+value+"%")
	case "eq":
		return scope.Where(fmt.Sprintf("%v = ?", scope.NewScope(nil).Quote(column)), value)
	case "gt":
		return scope.Where(fmt.Sprintf("%v > ?", scope.NewScope(nil).Quote(column)), value)
	case "gteq":
		return scope.Where(fmt.Sprintf("%v >= ?", scope.NewScope(nil).Quote(column)), value)
	case "lt":
		return scope.Where(fmt.Sprintf("%v < ?", scope.NewScope(nil).Quote(column)), value)
	case "lteq":
		return scope.Where(fmt.Sprintf("%v <= ?", scope.NewScope(nil).Quote(column)), value)
	}
	return scope
}
