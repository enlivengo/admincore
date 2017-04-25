package dummy

import (
	"fmt"

	"github.com/qor/admin"
	"github.com/qor/qor"
	"github.com/qor/qor/test/utils"
)

// NewAdmin generate admin for dummy app
func NewAdmin() *admin.Admin {
	var (
		db     = utils.TestDB()
		models = []interface{}{&User{}, &CreditCard{}, &Address{}, &Language{}, &Profile{}, &Phone{}, &Company{}}
		Admin  = admin.New(&qor.Config{DB: db})
	)

	for _, value := range models {
		db.DropTableIfExists(value)
		db.AutoMigrate(value)
	}

	user := Admin.AddResource(&User{})
	user.Meta(&admin.Meta{
		Name: "Languages",
		Type: "select_many",
		Collection: func(resource interface{}, context *qor.Context) (results [][]string) {
			if languages := []Language{}; !context.GetDB().Find(&languages).RecordNotFound() {
				for _, language := range languages {
					results = append(results, []string{fmt.Sprint(language.ID), language.Name})
				}
			}
			return
		},
	})

	return Admin
}
