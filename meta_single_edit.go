package admin

import "github.com/qor/qor/resource"

// SingleEditConfig meta configuration used for single edit
type SingleEditConfig struct {
	Template string
}

// ConfigureQorMeta configure single edit meta
func (singleEditConfig *SingleEditConfig) ConfigureQorMeta(metaor resource.Metaor) {
}
