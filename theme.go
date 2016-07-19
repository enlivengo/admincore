package admin

// ThemeInterface theme interface
type ThemeInterface interface {
	GetName() string
	GetViewPaths() []string
	ConfigAdminTheme(*Resource)
}

type Theme struct {
	Name string
}

func (theme Theme) GetName() string {
	return theme.Name
}

func (Theme) GetViewPaths() []string {
	return []string{}
}

func (Theme) ConfigAdminTheme(*Resource) {
	return
}
