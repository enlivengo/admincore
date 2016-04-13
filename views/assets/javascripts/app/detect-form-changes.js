var hasChanged = function( ele, options ) {
    var hasChangedObj = false;

    if ( this instanceof jQuery ) {
        options = ele;
        ele = this;

    } else if ( !( ele instanceof jQuery ) ) {
        ele = jQuery( ele );
    }

    ele.each( function( item, element ) {
        var jElement = jQuery( element );

        if ( jElement.is( 'form' ) ) {
            hasChangedObj = hasChanged( jElement.find( 'input, textarea, select' ), options );
            if ( hasChangedObj ) {
                return( false );
            }
        } else if ( jElement.is( ':checkbox' ) || jElement.is( ':radio' ) ) {
            if ( element.checked != element.defaultChecked ) {
                hasChangedObj = true;
                return false;
            }

        } else if ( jElement.is( 'input' ) || jElement.is( 'textarea' ) ) {
            if ( element.value != element.defaultValue ) {
                hasChangedObj = true;
                return false;
            }
        } else if ( jElement.is( 'select' ) ) {
            var option;
            var defaultSelectedIndex = 0;
            var numberOfOptions = element.options.length;

            for ( var i = 0; i < numberOfOptions; i++ ) {
                option = element.options[ i ];
                hasChangedObj = ( hasChangedObj || ( option.selected != option.defaultSelected ) );
                if ( option.defaultSelected ) {
                    defaultSelectedIndex = i;
                }
            }

            if ( hasChangedObj && !element.multiple ) {
                hasChangedObj = ( defaultSelectedIndex != element.selectedIndex );
            }

            if ( hasChangedObj ) {
                return false;
            }
        }

    });

    return hasChangedObj;

};

jQuery.fn.extend( {
    hasChanged : hasChanged
});