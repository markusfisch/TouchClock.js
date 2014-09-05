"use strict";

TouchClock.prototype.useDuration = true;
TouchClock.prototype.dialColor = "#ccc";
TouchClock.prototype.handColor = "#111";
TouchClock.prototype.durationColor = "#4b9";
TouchClock.prototype.handWidth = 2;
TouchClock.prototype.alpha = .2;

Math.PI2 = Math.PI2 || Math.PI/2;
Math.TAU = Math.TAU || Math.PI*2;

/**
 * A clock you can touch to set a time and a duration
 *
 * @param canvas - canvas element
 * @param callback - function to call for every update (optional)
 */
function TouchClock( canvas, callback )
{
	var ctx;

	if( !canvas ||
		!(ctx = canvas.getContext( "2d" )) )
		return null;

	var radMinute = Math.TAU/60,
		minuteRad = 60/Math.TAU,
		hourRad = 12/Math.TAU,
		minutesPerHourToRad = 720/Math.TAU,
		radPerMinutesPerHour = Math.TAU/720,
		tc = this,
		am,
		ratio,
		width,
		height,
		centerX,
		centerY,
		pageXOffset = 0,
		pageYOffset = 0,
		radiusDial,
		radiusCenter,
		radiusInnerHandle,
		radiusHandle,
		hands = {
			hour: {},
			minute: {},
			duration: {}
		},
		pointerLength = 0,
		pointerX = [],
		pointerY = [],
		pointerGrabbed = [],
		handsGrabbed = 0;

	function drawCenter()
	{
		ctx.fillStyle = tc.handColor;

		ctx.beginPath();
		ctx.arc(
			centerX,
			centerY,
			radiusCenter,
			0,
			Math.TAU,
			true );
		ctx.fill();
	}

	function drawHand( hand )
	{
		var a = hand.angle-Math.PI2,
			r = hand.radius,
			x = centerX+Math.cos( a )*r,
			y = centerY+Math.sin( a )*r;

		hand.x = x;
		hand.y = y;

		ctx.beginPath();
		ctx.moveTo( centerX | 0, centerY | 0 );
		ctx.lineTo( x | 0, y | 0 );
		ctx.stroke();

		ctx.globalAlpha = tc.alpha;
		ctx.beginPath();
		ctx.arc(
			x | 0,
			y | 0,
			radiusHandle,
			0,
			Math.TAU,
			false );
		ctx.fill();
		ctx.globalAlpha = 1;

		for( var n = pointerLength; n--; )
			if( pointerGrabbed[n] === hand )
			{
				ctx.stroke();
				break;
			}

		ctx.beginPath();
		ctx.arc(
			x | 0,
			y | 0,
			radiusInnerHandle,
			0,
			Math.TAU,
			false );
		ctx.fill();
	}

	function drawDuration()
	{
		var a1 = getAngle( hands.hour.angle-Math.PI2 ),
			a2 = getAngle( hands.duration.angle-Math.PI2 );

		ctx.fillStyle = tc.durationColor;
		ctx.strokeStyle = tc.durationColor;

		ctx.globalAlpha = tc.alpha;
		ctx.beginPath();
		ctx.moveTo( centerX | 0, centerY | 0 );
		ctx.arc(
			centerX | 0,
			centerY | 0,
			hands.duration.radius,
			a1,
			a2,
			false );
		ctx.lineTo( centerX | 0, centerY | 0 );
		ctx.fill();
		ctx.globalAlpha = 1;

		ctx.lineWidth = tc.handWidth*ratio;
		drawHand( hands.duration );
	}

	function drawHands()
	{
		if( tc.useDuration )
			drawDuration();

		ctx.lineWidth = tc.handWidth*ratio;
		ctx.fillStyle = tc.handColor;
		ctx.strokeStyle = tc.handColor;

		drawHand( hands.hour );
		drawHand( hands.minute );
		ctx.lineWidth = 1;
	}

	function drawDial()
	{
		ctx.strokeStyle = tc.dialColor;

		ctx.beginPath();
		ctx.arc(
			centerX,
			centerY,
			radiusDial,
			0,
			Math.TAU,
			true );
		ctx.stroke();

		ctx.beginPath();

		for( var a = 0, n = 0, r1 = radiusDial*.85, r2 = radiusDial*.95;
			a < Math.TAU;
			a += radMinute, ++n )
		{
			var cos = Math.cos( a ),
				sin = Math.sin( a ),
				r = n % 5 ? r2 : r1;

			ctx.moveTo(
				(centerX+r*cos) | 0,
				(centerY+r*sin) | 0 );
			ctx.lineTo(
				(centerX+radiusDial*cos) | 0,
				(centerY+radiusDial*sin) | 0 );
		}

		ctx.stroke();
	}

	function draw()
	{
		ctx.clearRect( 0, 0, width, height );
		ctx.lineWidth = 1;

		drawDial();
		drawHands();
		drawCenter();
	}

	function getAngle( a )
	{
		return (a+Math.TAU) % Math.TAU;
	}

	function getHourAngle( h, m )
	{
		return radPerMinutesPerHour*((h > 12 ? h-12 : h)*60+m);
	}

	function getMinuteAngle( m )
	{
		return radMinute*m;
	}

	function getDurationAngle( h, m, d )
	{
		return getHourAngle( h+d/60, m );
	}

	function getAngleDifference( d )
	{
		var r = Math.abs( d );

		if( Math.TAU-r < r )
			d = -d;

		return d;
	}

	function padNumber( num, size )
	{
		var s = num+"";

		while( s.length < size )
			s = "0" + s;

		return s;
	}

	function getStartTime()
	{
		return {
			hour: hands.hour.value,
			minute: hands.minute.value
		};
	}

	function getStopTime()
	{
		var d = hands.minute.value+hands.duration.value,
			m = d % 60,
			h = hands.hour.value+(d/60 | 0);

		return {
			hour: h % 24,
			minute: m % 60
		};
	}

	function getStartTimeAsString()
	{
		var t = getStartTime();

		return padNumber( t.hour, 2 )+":"+padNumber( t.minute, 2 );
	}

	function getStopTimeAsString()
	{
		var t = getStopTime();

		return padNumber( t.hour, 2 )+":"+padNumber( t.minute, 2 );
	}

	function setDurationFromAngle()
	{
		var d = getAngle( hands.duration.angle ),
			h = getAngle( hands.hour.angle );

		while( d < h )
			d += Math.TAU;

		hands.duration.value = Math.round(
			minutesPerHourToRad*(d-h) );
	}

	function setHourFromAngle()
	{
		hands.hour.value = Math.floor(
			getAngle( hands.hour.angle )*
			hourRad+
			(am ? 0 : 12) ) % 24;
	}

	function setMinuteFromAngle()
	{
		hands.minute.value = Math.floor(
			getAngle( hands.minute.angle )*
			minuteRad ) % 60;
	}

	function setHourAngle()
	{
		hands.hour.angle = getHourAngle(
			hands.hour.value,
			hands.minute.value );
	}

	function setMinuteAngle()
	{
		hands.minute.angle = getMinuteAngle(
			hands.minute.value );
	}

	function setDurationAngle()
	{
		hands.duration.angle = getAngle(
			hands.hour.angle+
			radPerMinutesPerHour*hands.duration.value );
	}

	function setAngles()
	{
		setHourAngle();
		setMinuteAngle();

		if( tc.useDuration )
			setDurationAngle();
	}

	function addHours( h )
	{
		h += hands.hour.value;

		while( h < 0 )
			h += 24;

		h %= 24;

		hands.hour.value = h;
		setHourAngle();
	}

	function moveHands()
	{
		for( var n = pointerLength; n--; )
		{
			var hand = pointerGrabbed[n];

			if( !hand )
				continue;

			hand.angle = Math.atan2(
				pointerY[n]-centerY,
				pointerX[n]-centerX )+Math.PI2;

			if( hand === hands.hour )
			{
				setHourFromAngle();

				var a = getAngle( hand.angle ),
					d = getAngleDifference( a-getAngle( hand.last ) );

				if( tc.useDuration &&
					handsGrabbed == 1 )
					setDurationAngle();

				if( (d > 0 && hand.last > a) ||
					(d < 0 && hand.last < a) )
					am ^= true;

				hand.last = a;
			}
			else if( hand === hands.minute )
			{
				setMinuteFromAngle();

				if( handsGrabbed == 1 )
					setHourAngle();

				var a = getAngle( hand.angle ),
					d = getAngleDifference( a-getAngle( hand.last ) );

				if( d > 0 && hand.last > a )
					addHours( 1 );
				else if( d < 0 && hand.last < a )
					addHours( -1 );

				hand.last = a;

				if( tc.useDuration &&
					handsGrabbed == 1 )
					setDurationAngle();
			}
			else if( hand === hands.duration )
			{
				setDurationFromAngle();
			}
		}
	}

	function handAt( x, y )
	{
		for( var name in hands )
		{
			var hand = hands[name],
				dx = x-hand.x,
				dy = y-hand.y,
				d = Math.sqrt( dx*dx + dy*dy );

			if( d < radiusHandle )
				return hand;
		}

		return null;
	}

	function assignPointersToHands()
	{
		for( var n = pointerLength; n--; )
			if( (pointerGrabbed[n] = handAt( pointerX[n], pointerY[n] )) )
				++handsGrabbed;
	}

	function setPointers( ev, down )
	{
		var e = ev || event;

		if( down < 1 )
		{
			// process other touches
			if( pointerLength > 0 &&
				e.touches &&
				(down = e.touches.length) )
				return setPointers( e, down );

			pointerLength = 0;
		}
		else if( e.touches )
		{
			pointerLength = e.touches.length;

			for( var n = 0; n < pointerLength; ++n )
			{
				var t = e.touches[n];

				pointerX[n] = t.clientX;
				py = pointerY[n] = t.clientY;
			}
		}
		else if( typeof e.clientX !== "undefined" )
		{
			pointerX[0] = e.clientX;
			pointerY[0] = e.clientY;
			pointerLength = 1;
		}
		else if( typeof e.pageX !== "undefined" )
		{
			pointerX[0] = e.pageX;
			pointerY[0] = e.pageY;
			pointerLength = 1;
		}

		// this needs to be done every time since the
		// offset may change due to CSS transitions
		var offsetLeft = 0,
			offsetTop = 0;

		for( var e = canvas; e; e = e.offsetParent )
		{
			offsetLeft += e.offsetLeft;
			offsetTop += e.offsetTop;
		}

		offsetLeft -= pageXOffset;
		offsetTop -= pageYOffset;

		for( var n = 0; n < pointerLength; ++n )
		{
			pointerX[n] = (pointerX[n]-offsetLeft)*ratio | 0;
			pointerY[n] = (pointerY[n]-offsetTop)*ratio | 0;
		}
	}

	function consumeEvent( ev )
	{
		(ev || event).preventDefault();
		return false;
	}

	function pointerUp( ev )
	{
		if( handsGrabbed < 1 )
			return true;

		handsGrabbed = 0;

		setAngles();
		setPointers( ev, 0 );
		draw();

		return consumeEvent( ev );
	}

	function pointerMove( ev )
	{
		if( handsGrabbed < 1 )
			return true;

		setPointers( ev, pointerLength );
		moveHands();

		if( callback )
			callback();

		draw();

		return consumeEvent( ev );
	}

	function pointerDown( ev )
	{
		handsGrabbed = 0;

		setPointers( ev, 1 );
		assignPointersToHands();

		if( handsGrabbed < 1 )
			return true;

		draw();

		return consumeEvent( ev );
	}

	function recordScrollPosition( ev )
	{
		pageXOffset = window.pageXOffset;
		pageYOffset = window.pageYOffset;

		return consumeEvent( ev );
	}

	function resize()
	{
		var w = canvas.width,
			h = canvas.height;

		width = w*ratio;
		height = h*ratio;

		canvas.width = width;
		canvas.height = height;
		canvas.style.width = w+"px";
		canvas.style.height = h+"px";

		centerX = width >> 1;
		centerY = height >> 1;

		var min = Math.min( width, height );
		radiusDial = min*.49 | 0;
		radiusCenter = Math.max( 4, min*.02 ) | 0;
		radiusInnerHandle = radiusCenter;
		radiusHandle = radiusCenter*4;

		hands.hour.radius = radiusDial*.4;
		hands.minute.radius = radiusDial*.8;
		hands.duration.radius = radiusDial*.6;
	}

	function setHands( h, m, dh, dm )
	{
		hands.hour.value = h;
		hands.minute.value = m;

		am = h < 12;

		if( tc.useDuration )
		{
			dh = dh || 120;

			if( typeof dm === 'undefined' )
				hands.duration.value = dh;
			else
			{
				hands.duration.angle = getHourAngle( dh, dm );
				setDurationFromAngle();
			}
		}

		setAngles();

		hands.hour.last = hands.hour.angle;
		hands.minute.last = hands.minute.angle;

		draw();
	}

	function addEventListener( e, name, handler )
	{
		if( "addEventListener" in e )
			e.addEventListener( name, handler, true );
		else
			e.attachEvent( "on"+name, handler );
	}

	function init()
	{
		ratio =
			(window.devicePixelRatio || 1)/
			(ctx.webkitBackingStorePixelRatio ||
				ctx.mozBackingStorePixelRatio ||
				ctx.msBackingStorePixelRatio ||
				ctx.oBackingStorePixelRatio ||
				ctx.backingStorePixelRatio ||
				1);

		addEventListener( canvas, "mousedown", pointerDown );
		addEventListener( canvas, "mousemove", pointerMove );
		addEventListener( canvas, "mouseup", pointerUp );
		addEventListener( canvas, "mouseout", pointerUp );

		if( "ontouchstart" in canvas )
		{
			addEventListener( canvas, "touchstart", pointerDown );
			addEventListener( canvas, "touchmove", pointerMove );
			addEventListener( canvas, "touchend", pointerUp );
		}

		if( window.navigator.msPointerEnabled )
			canvas.style.msTouchAction = "none";

		addEventListener( document, "scroll", recordScrollPosition );
	}

	init();
	resize();

	var now = new Date();
	setHands(
		now.getHours(),
		now.getMinutes(),
		120 );

	return {
		getStartTimeAsString: getStartTimeAsString,
		getStopTimeAsString: getStopTimeAsString,
		getStartTime: getStartTime,
		getStopTime: getStopTime,
		setHands: setHands,
		resize: resize,
		draw: draw
	};
}
