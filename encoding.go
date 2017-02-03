package admin

import "errors"

type Decoder struct {
	Action   string
	Resource *Resource
	Context  *Context
	Result   interface{}
}

type Responder struct {
	Action   string
	Resource *Resource
	Context  *Context
	Result   interface{}
}

type EncodingInterface interface {
	CouldDecode(Decoder) bool
	Decode(Decoder) error

	CouldRespond(Responder) bool
	Respond(Responder) error
}

type Encoding struct {
	Encodings []EncodingInterface
}

func (encoding *Encoding) RegisterEncoding(e EncodingInterface) {
	encoding.Encodings = append(encoding.Encodings, e)
}

func (encoding *Encoding) Decode(decoder Decoder) error {
	for _, d := range encoding.Encodings {
		if d.CouldDecode(decoder) {
			return d.Decode(decoder)
		}
	}
	return errors.New("decoder not found")
}

func (encoding *Encoding) Respond(responder Responder) error {
	for _, f := range encoding.Encodings {
		if f.CouldRespond(responder) {
			return f.Respond(responder)
		}
	}
	return errors.New("responder not found")
}
