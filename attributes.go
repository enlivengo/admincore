package admin

import (
	"fmt"
	"strings"

	"github.com/qor/qor/utils"
)

// Section alias to Attributes for compatibility
type Section Attributes

// Attributes attributes group
// used to structure fields, it could group your fields into sections, to make your form clean & tidy
//    product.EditAttrs(
//      &admin.Attributes{
//      	Title: "Basic Information",
//      	Rows: [][]string{
//      		{"Name"},
//      		{"Code", "Price"},
//      	}},
//      &admin.Attributes{
//      	Title: "Organization",
//      	Rows: [][]string{
//      		{"Category", "Collections", "MadeCountry"},
//      	}},
//      "Description",
//      "ColorVariations",
//    }
type Attributes struct {
	Resource  *Resource // TODO remove that
	Title     string
	Rows      [][]string
	rows      [][]*Attribute
	Permanent bool
	Priority  int
	Formats   []string
	Visible   func(interface{}, *Context) bool
}

// Attribute attribute setting
type Attribute struct {
	Name      string
	Permanent bool
	Priority  int
	Formats   []string
	Visible   func(interface{}, *Context) bool
}

// String stringify section
func (attributes *Attributes) String() string {
	return fmt.Sprint(attributes.Rows)
}

// GetAttribute get attribute from Attributes
func (attributes *Attributes) GetAttribute(name string) *Attribute {
	for _, row := range attributes.rows {
		for _, attribute := range row {
			if attribute.Name == name {
				return attribute
			}
		}
	}
	return nil
}

func (res *Resource) generateAttributes(values ...interface{}) []*Attributes {
	var sections []*Attributes
	var hasColumns, excludedColumns []string

	// Reverse values to make the last one as a key one
	// e.g. Name, Code, -Name (`-Name` will get first and will skip `Name`)
	for i := len(values) - 1; i >= 0; i-- {
		value := values[i]
		if section, ok := value.(*Attributes); ok {
			sections = append(sections, uniqueAttributes(section, &hasColumns))
		} else if column, ok := value.(string); ok {
			if strings.HasPrefix(column, "-") {
				excludedColumns = append(excludedColumns, column)
			} else if !isContainsColumn(excludedColumns, column) {
				sections = append(sections, &Attributes{Rows: [][]string{{column}}})
			}
			hasColumns = append(hasColumns, column)
		} else if row, ok := value.([]string); ok {
			for j := len(row) - 1; j >= 0; j-- {
				column = row[j]
				sections = append(sections, &Attributes{Rows: [][]string{{column}}})
				hasColumns = append(hasColumns, column)
			}
		} else {
			utils.ExitWithMsg(fmt.Sprintf("Qor Resource: attributes should be Attributes or String, but it is %+v", value))
		}
	}

	sections = reverseAttributes(sections)
	for _, section := range sections {
		section.Resource = res
	}
	return sections
}

func uniqueAttributes(section *Attributes, hasColumns *[]string) *Attributes {
	newAttributes := Attributes{Title: section.Title}
	var newRows [][]string
	for _, row := range section.Rows {
		var newColumns []string
		for _, column := range row {
			if !isContainsColumn(*hasColumns, column) {
				newColumns = append(newColumns, column)
				*hasColumns = append(*hasColumns, column)
			}
		}
		if len(newColumns) > 0 {
			newRows = append(newRows, newColumns)
		}
	}
	newAttributes.Rows = newRows
	return &newAttributes
}

func reverseAttributes(sections []*Attributes) []*Attributes {
	var results []*Attributes
	for i := 0; i < len(sections); i++ {
		results = append(results, sections[len(sections)-i-1])
	}
	return results
}

func isContainsColumn(hasColumns []string, column string) bool {
	for _, col := range hasColumns {
		if strings.TrimLeft(col, "-") == strings.TrimLeft(column, "-") {
			return true
		}
	}
	return false
}

func containsPositiveValue(values ...interface{}) bool {
	for _, value := range values {
		if _, ok := value.(*Attributes); ok {
			return true
		} else if column, ok := value.(string); ok {
			if !strings.HasPrefix(column, "-") {
				return true
			}
		} else {
			utils.ExitWithMsg(fmt.Sprintf("Qor Resource: attributes should be Attributes or String, but it is %+v", value))
		}
	}
	return false
}

// ConvertAttributesToMetas convert section to metas
func (res *Resource) ConvertAttributesToMetas(sections []*Attributes) []*Meta {
	var metas []*Meta
	for _, section := range sections {
		for _, row := range section.Rows {
			for _, col := range row {
				meta := res.GetMetaOrNew(col)
				if meta != nil {
					metas = append(metas, meta)
				}
			}
		}
	}
	return metas
}

// ConvertAttributesToStrings convert section to strings
func (res *Resource) ConvertAttributesToStrings(sections []*Attributes) []string {
	var columns []string
	for _, section := range sections {
		for _, row := range section.Rows {
			for _, col := range row {
				columns = append(columns, col)
			}
		}
	}
	return columns
}

func (res *Resource) setAttributes(sections *[]*Attributes, values ...interface{}) {
	if len(values) == 0 {
		if len(*sections) == 0 {
			*sections = res.generateAttributes(res.allAttrs())
		}
	} else {
		var flattenValues []interface{}

		for _, value := range values {
			if columns, ok := value.([]string); ok {
				for _, column := range columns {
					flattenValues = append(flattenValues, column)
				}
			} else if _sections, ok := value.([]*Attributes); ok {
				for _, section := range _sections {
					flattenValues = append(flattenValues, (*Attributes)(section))
				}
			} else if section, ok := value.(*Attributes); ok {
				flattenValues = append(flattenValues, section)
			} else if _sections, ok := value.([]*Section); ok {
				for _, section := range _sections {
					flattenValues = append(flattenValues, section)
				}
			} else if section, ok := value.(*Section); ok {
				flattenValues = append(flattenValues, (*Attributes)(section))
			} else if column, ok := value.(string); ok {
				flattenValues = append(flattenValues, column)
			} else {
				utils.ExitWithMsg(fmt.Sprintf("Qor Resource: attributes should be Attributes or String, but it is %+v", value))
			}
		}

		if containsPositiveValue(flattenValues...) {
			*sections = res.generateAttributes(flattenValues...)
		} else {
			var columns, availbleColumns []string
			for _, value := range flattenValues {
				if column, ok := value.(string); ok {
					columns = append(columns, column)
				}
			}

			for _, column := range res.allAttrs() {
				if !isContainsColumn(columns, column) {
					availbleColumns = append(availbleColumns, column)
				}
			}
			*sections = res.generateAttributes(availbleColumns)
		}
	}
}
