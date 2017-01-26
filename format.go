package admin

type Format struct {
	Action   string
	Resource *Resource
	Context  *Context
	Result   interface{}
}

type Decoder interface {
	CouldDecode(Format) bool
	Decode(Format) error
}

type Responder interface {
	CouldRespond(Format) bool
	Respond(Format) error
}

var decoders []Decoder
var responder []Responder

func RegisterDecoder(format string, decoder Decoder) {
	decoders = append(decoders, decoder)
}

func RegisterResponder(format string, responder Responder) {
	responders = append(responders, responder)
}

func Decode(format Format) {
	for _, decoder := range decoders {
		if formatter.CouldDecode(format) {
			formatter.Decode(format)
			break
		}
	}
}

func Respond(format Format) {
	for _, formatter := range formatters {
		if formatter.CouldRespond(format) {
			formatter.Respond(format)
			break
		}
	}
}
