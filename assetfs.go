package admin

var AssetFS AssetFSInterface

type AssetFSInterface interface {
	RegisterPath(path string) error
	Asset(name string) ([]byte, error)
	Glob(pattern string) (matches []string, err error)
	Compile() error
}
