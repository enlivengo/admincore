package admin

import (
	"github.com/qor/qor/resource"
)

type RichEditorConfig struct {
	AssetManager *Resource
	Plugins      []RedactorPlugin
	Settings     map[string]interface{}
	metaConfig
}

type RedactorPlugin struct {
	Name   string
	Source string
}

// ConfigureQorMeta configure rich editor meta
func (richEditorConfig *RichEditorConfig) ConfigureQorMeta(metaor resource.Metaor) {
	if meta, ok := metaor.(*Meta); ok {
		meta.Type = "rich_editor"

		// Compatible with old rich editor setting
		if meta.Resource != nil {
			richEditorConfig.AssetManager = meta.Resource
			meta.Resource = nil
		}

		if richEditorConfig.Settings == nil {
			richEditorConfig.Settings = map[string]interface{}{}
		}

		plugins := []string{"source"}
		for _, plugin := range richEditorConfig.Plugins {
			plugins = append(plugins, plugin.Name)
		}
		richEditorConfig.Settings["plugins"] = plugins
	}
}
