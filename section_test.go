package admin_test

import (
	"testing"

	"github.com/qor/admin"
	. "github.com/qor/admin/tests/dummy"
)

func TestSections(t *testing.T) {
	userRes := Admin.NewResource(&User{})
	userRes.IndexAttrs(&admin.Section{
		Rows:      [][]string{{"Name", "Age", "Role"}},
		Permanent: true,
	})

	userRes.IndexAttrs(&admin.Section{
		Rows: [][]string{{"RegisteredAt", "Avatar"}},
	})

	indexSections := userRes.IndexAttrs()
}
