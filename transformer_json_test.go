package admin_test

import (
	"bytes"
	"errors"
	"testing"

	"github.com/qor/admin"
)

func TestJSONTransformerEncode(t *testing.T) {
	var (
		buffer          bytes.Buffer
		jsonTransformer = &admin.JSONTransformer{}
		encoder         = admin.Encoder{
			Action:   "show",
			Resource: Admin.GetResource("User"),
			Context:  Admin.NewContext(nil, nil),
			Result:   &User{},
		}
	)

	if err := jsonTransformer.Encode(&buffer, encoder); err != nil {
		t.Errorf("no error should returned when encode object to JSON")
	}
}

func TestJSONTransformerEncodeMap(t *testing.T) {
	var (
		buffer          bytes.Buffer
		jsonTransformer = &admin.JSONTransformer{}
		encoder         = admin.Encoder{
			Result: map[string]interface{}{"error": []error{errors.New("error1"), errors.New("error2")}},
		}
	)

	jsonTransformer.Encode(&buffer, encoder)

	except := "{\n\t\"error\": [\n\t\t\"error1\",\n\t\t\"error2\"\n\t]\n}"
	if except != buffer.String() {
		t.Errorf("Failed to decode errors map to JSON, except: %v, but got %v", except, buffer.String())
	}
}
