package admin

import (
	"fmt"
	"reflect"

	"github.com/qor/qor"
	"github.com/qor/qor/utils"
	"github.com/qor/roles"
)

// Action register action for qor resource
func (res *Resource) Action(action *Action) {
	if action.Label == "" {
		action.Label = utils.HumanizeString(action.Name)
	}

	if action.Method == "" {
		if action.URL != nil {
			action.Method = "GET"
		} else {
			action.Method = "PUT"
		}
	}

	if action.URLOpenType == "" {
		if action.Resource != nil {
			action.URLOpenType = "bottomsheet"
		} else if action.Method == "GET" {
			action.URLOpenType = "_blank"
		}
	}

	res.Actions = append(res.Actions, action)
}

func (res *Resource) GetAction(name string) *Action {
	for _, action := range res.Actions {
		if action.Name == name {
			return action
		}
	}
	return nil
}

// ActionArgument action argument that used in handle
type ActionArgument struct {
	PrimaryValues       []string
	Context             *Context
	Argument            interface{}
	SkipDefaultResponse bool
}

// Action action definiation
type Action struct {
	Name        string
	Label       string
	Method      string
	URL         func(record interface{}, context *Context) string
	URLOpenType string
	Visible     func(record interface{}, context *Context) bool
	Handle      func(argument *ActionArgument) error
	Modes       []string
	Resource    *Resource
	Permission  *roles.Permission
}

// ToParam used to register routes for actions
func (action Action) ToParam() string {
	return utils.ToParamString(action.Name)
}

// IsAllowed check if current user has permission to view the action
func (action Action) IsAllowed(mode roles.PermissionMode, context *Context, records ...interface{}) bool {
	if action.Visible != nil {
		for _, record := range records {
			if !action.Visible(record, context) {
				return false
			}
		}
	}

	if action.Permission != nil {
		return action.HasPermission(mode, context.Context)
	}

	if context.Resource != nil {
		return context.Resource.HasPermission(mode, context.Context)
	}
	return true
}

// HasPermission check if current user has permission for the action
func (action Action) HasPermission(mode roles.PermissionMode, context *qor.Context) bool {
	if action.Permission != nil {
		return action.Permission.HasPermission(mode, context.Roles...)
	}

	return true
}

// FindSelectedRecords find selected records when run bulk actions
func (actionArgument *ActionArgument) FindSelectedRecords() []interface{} {
	var (
		context  = actionArgument.Context
		resource = context.Resource
		records  = []interface{}{}
	)

	clone := context.clone()
	clone.SetDB(clone.GetDB().Where(fmt.Sprintf("%v IN (?)", resource.PrimaryDBName()), actionArgument.PrimaryValues))
	results, _ := clone.FindMany()

	resultValues := reflect.Indirect(reflect.ValueOf(results))
	for i := 0; i < resultValues.Len(); i++ {
		records = append(records, resultValues.Index(i).Interface())
	}
	return records
}
