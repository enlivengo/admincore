package admin

import "github.com/qor/qor/resource"

// CollectionEditConfig meta configuration used for collection edit
type CollectionEditConfig struct {
	Template string
	metaConfig
}

// ConfigureQorMeta configure collection edit meta
func (collectionEditConfig *CollectionEditConfig) ConfigureQorMeta(metaor resource.Metaor) {
}
