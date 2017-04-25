package dummy

import (
	"time"

	"github.com/jinzhu/gorm"
	"github.com/qor/media/oss"
)

type CreditCard struct {
	gorm.Model
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
	CreditCardID uint
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
