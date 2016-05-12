package bindata

import "github.com/qor/admin"

// TODO
// generate config.bindata.go - copy config.go add build tag
// generate bindata.go
// read bindata.go from config.bindata.go
// add build tag to config.go

type Bindata struct {
	AssetFileSystem admin.AssetFSInterface
	Config          *Config
}

type Config struct {
}

func New(config *Config) *Bindata {
	return &Bindata{AssetFileSystem: &admin.AssetFileSystem{}, Config: config}
}

func (bindata *Bindata) RegisterPath(path string) error {
	return bindata.AssetFileSystem.RegisterPath(path)
}

func (bindata *Bindata) Asset(name string) ([]byte, error) {
	return bindata.AssetFileSystem.Asset(name)
}

func (bindata *Bindata) Glob(pattern string) (matches []string, err error) {
	return bindata.AssetFileSystem.Glob(name)
}

func (bindata *Bindata) Compile() error {
	return bindata.AssetFileSystem.Compile()
}
