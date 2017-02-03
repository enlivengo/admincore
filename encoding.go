package admin

import (
	"errors"
	"io"
)

type Decoder struct {
	Action   string
	Resource *Resource
	Context  *Context
	Result   interface{}
}

type Encoder struct {
	Action   string
	Resource *Resource
	Context  *Context
	Result   interface{}
}

type EncodingInterface interface {
	CouldDecode(Decoder) bool
	Decode(dst interface{}, decoder Decoder) error
	CouldEncode(Encoder) bool
	Encode(writer io.Writer, encoder Encoder) error
}

type Encoding struct {
	Encodings []EncodingInterface
}

func (encoding *Encoding) RegisterEncoding(e EncodingInterface) {
	encoding.Encodings = append(encoding.Encodings, e)
}

func (encoding *Encoding) Decode(dst interface{}, decoder Decoder) error {
	for _, d := range encoding.Encodings {
		if d.CouldDecode(decoder) {
			return d.Decode(decoder)
		}
	}
	return errors.New("decoder not found")
}

func (encoding *Encoding) Encode(writer io.Writer, encoder Encoder) error {
	for _, f := range encoding.Encodings {
		if f.CouldEncode(encoder) {
			return f.Encode(encoder)
		}
	}
	return errors.New("encoder not found")
}
