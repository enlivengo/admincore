package admin

import (
	"fmt"

	"github.com/jinzhu/gorm"
	"github.com/qor/qor"
	"github.com/qor/qor/resource"
)

// Filter register filter for qor resource
func (res *Resource) Filter(filter *Filter) {
	res.filters = append(res.filters, filter)

	if filter.Handler == nil {
		// generate default handler
		filter.Handler = func(db *gorm.DB, filterArgument *FilterArgument) *gorm.DB {
			if metaValue := filterArgument.Value.Get("Value"); metaValue != nil {
				return defaultFieldFilter(res, []string{filter.Name}, fmt.Sprint(metaValue.Value), db)
			}
			return db
		}
	}
}

func (res *Resource) GetFilters() []*Filter {
	return res.filters
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
	Config  FilterConfigInterface
}

type FilterConfigInterface interface {
	ConfigureQORAdminFilter(*Filter)
}
