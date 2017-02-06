package admin

import (
	"errors"
	"io"

	"github.com/qor/qor"
	"github.com/qor/qor/resource"
)

var (
	ErrUnsupportedEncoder = errors.New("unsupported encoder")
	ErrUnsupportedDecoder = errors.New("unsupported decoder")
)

type Encoding struct {
	Encoders []EncoderInterface
	Decoders []DecoderInterface
}

type EncoderInterface interface {
	CouldEncode(Encoder) bool
	Encode(writer io.Writer, encoder Encoder) error
}

type Encoder struct {
	Action   string
	Resource *resource.Resource
	Context  *qor.Context
	Result   interface{}
}

func (encoding *Encoding) Encode(writer io.Writer, encoder Encoder) error {
	for _, f := range encoding.Encoders {
		if f.CouldEncode(encoder) {
			if err := f.Encode(writer, encoder); err != ErrUnsupportedEncoder {
				return err
			}
		}
	}
	return ErrUnsupportedEncoder
}

type DecoderInterface interface {
	CouldDecode(Decoder) bool
	Decode(dst interface{}, decoder Decoder) error
}

type Decoder struct {
	Action   string
	Resource *resource.Resource
	Context  *qor.Context
	Result   interface{}
}

func (encoding *Encoding) Decode(dst interface{}, decoder Decoder) error {
	for _, d := range encoding.Decoders {
		if d.CouldDecode(decoder) {
			if err := d.Decode(dst, decoder); err != ErrUnsupportedDecoder {
				return err
			}
		}
	}

	return ErrUnsupportedDecoder
}
