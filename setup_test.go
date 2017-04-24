package admin_test

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"time"

	"github.com/jinzhu/gorm"
	"github.com/qor/admin"
	"github.com/qor/media/oss"
	"github.com/qor/qor"
	"github.com/qor/qor/test/utils"
)

type CreditCard struct {
	gorm.Model
	UserID uint
	Number string
	Issuer string
}

type Company struct {
	gorm.Model
	Name string
}

type Address struct {
	gorm.Model
	UserID   uint
	Address1 string
	Address2 string
}

type Language struct {
	gorm.Model
	Name string
}

type User struct {
	gorm.Model
	Name         string
	Age          uint
	Role         string
	Active       bool
	RegisteredAt *time.Time
	Avatar       oss.OSS
	Profile      Profile
	CreditCard   CreditCard
	Addresses    []Address
	Languages    []Language `gorm:"many2many:user_languages;"`
	CompanyID    uint
	Company      Company // FIXME use pointer
}

type Profile struct {
	gorm.Model
	UserID uint
	Name   string
	Sex    string

	Phone Phone
}

type Phone struct {
	gorm.Model

	ProfileID uint64
	Num       string
}

var (
	server *httptest.Server
	db     *gorm.DB
	Admin  *admin.Admin
)

func init() {
	mux := http.NewServeMux()
	db = utils.TestDB()
	models := []interface{}{&User{}, &CreditCard{}, &Address{}, &Language{}, &Profile{}, &Phone{}, &Company{}}
	for _, value := range models {
		db.DropTableIfExists(value)
		db.AutoMigrate(value)
	}

	Admin = admin.New(&qor.Config{DB: db})
	user := Admin.AddResource(&User{})
	user.Meta(&admin.Meta{Name: "Languages", Type: "select_many",
		Collection: func(resource interface{}, context *qor.Context) (results [][]string) {
			if languages := []Language{}; !context.GetDB().Find(&languages).RecordNotFound() {
				for _, language := range languages {
					results = append(results, []string{fmt.Sprint(language.ID), language.Name})
				}
			}
			return
		}})

	Admin.MountTo("/admin", mux)

	server = httptest.NewServer(mux)
}
