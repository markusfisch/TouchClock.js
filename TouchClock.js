"use strict";

TouchClock.prototype.useDuration = true;
TouchClock.prototype.hour = new Date().getHours();
TouchClock.prototype.minute = new Date().getMinutes();
TouchClock.prototype.duration = 120;
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
		pointerGrabbed = [];

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

	function pad( num, size )
	{
		var s = num+"";

		while( s.length < size )
			s = "0" + s;

		return s;
	}

	function getStartTime()
	{
		return {
			hour: tc.hour,
			minute: tc.minute
		};
	}

	function getStopTime()
	{
		var d = tc.minute+tc.duration,
			m = d % 60,
			h = tc.hour+(d/60 | 0);

		return {
			hour: h,
			minute: m
		};
	}

	function getStartTimeAsString()
	{
		return pad( tc.hour, 2 )+":"+pad( tc.minute, 2 );
	}

	function getStopTimeAsString()
	{
		var t = getStopTime();

		return pad( t.hour, 2 )+":"+pad( t.minute, 2 );
	}

	function setTimeAndDuration()
	{
		tc.hour = Math.round(
			getAngle( hands.hour.angle )*
			hourRad+
			(am ? 0 : 12) ) % 24;

		tc.minute = Math.round(
			getAngle( hands.minute.angle )*
			minuteRad ) % 60;

		var d = getAngle( hands.duration.angle ),
			h = getAngle( hands.hour.angle );

		while( d < h )
			d += Math.TAU;

		tc.duration = Math.round(
			minutesPerHourToRad*(d-h) );

		if( callback )
			callback();
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

	function setPointers( ev, down )
	{
		var e = ev || event;

		if( !down )
		{
			// process other touches
			if( e.touches &&
				(down = e.touches.length) )
				return setPointerss( e, down );

			pointerLength = 0;
		}
		else if( e.touches )
		{
			pointerLength = e.touches.length;

			for( var n = 0; n < pointerLength; ++n )
			{
				var t = e.touches[n];

				pointerX[n] = t.pageX;
				pointerY[n] = t.pageY;
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
		// offset may change due to transitions
		var offsetLeft = 0,
			offsetTop = 0;

		for( var e = canvas; e; e = e.offsetParent )
		{
			offsetLeft += e.offsetLeft;
			offsetTop += e.offsetTop;
		}

		var body = typeof document.documentElement !== 'undefined' ?
				document.documentElement :
				document.body;

		offsetLeft -= body.scrollLeft;
		offsetTop -= body.scrollTop;

		for( var n = 0; n < pointerLength; ++n )
		{
			pointerX[n] = (pointerX[n]-offsetLeft)*ratio | 0;
			pointerY[n] = (pointerY[n]-offsetTop)*ratio | 0;
		}

		ev.preventDefault();
		return false;
	}

	function pointerUp( ev )
	{
		var r = setPointers( ev, 0 );
		draw();

		return r;
	}

	function pointerMove( ev )
	{
		if( pointerLength < 1 )
			return;

		var r = setPointers( ev, pointerLength );

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
				var a = getAngle( hand.angle ),
					d = a-getAngle( hand.last ),
					r = Math.abs( d );

				if( pointerLength == 1 )
					hands.duration.angle =
						a+
						getAngle( hands.duration.angle )-
						getAngle( hand.last );

				if( Math.TAU-r < r )
					d = -d;

				if( (d > 0 && hand.last > a) ||
					(d < 0 && hand.last < a) )
					am ^= true;

				hand.last = a;
			}
		}

		if( pointerLength )
		{
			setTimeAndDuration();
			draw();
		}

		return r;
	}

	function pointerDown( ev )
	{
		var r = setPointers( ev, 1 );

		for( var n = pointerLength; n--; )
			pointerGrabbed[n] = handAt( pointerX[n], pointerY[n] );

		if( pointerLength )
			draw();

		return r;
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

	function setHands( h, m, d )
	{
		hands.hour.angle = hands.hour.last = getHourAngle( h, m );
		hands.minute.angle = hands.minute.last = getMinuteAngle( m );
		hands.duration.angle = getDurationAngle( h, m, d );

		am = h < 12;
	}

	function init()
	{
		setHands( tc.hour, tc.minute, tc.duration );

		ratio =
			(window.devicePixelRatio || 1)/
			(ctx.webkitBackingStorePixelRatio ||
				ctx.mozBackingStorePixelRatio ||
				ctx.msBackingStorePixelRatio ||
				ctx.oBackingStorePixelRatio ||
				ctx.backingStorePixelRatio ||
				1);

		canvas.onmousedown = pointerDown;
		canvas.onmousemove = pointerMove;
		canvas.onmouseup = pointerUp;
		canvas.onmouseout = pointerUp;

		if( "ontouchstart" in canvas )
		{
			canvas.ontouchstart = pointerDown;
			canvas.ontouchmove = pointerMove;
			canvas.ontouchend = pointerUp;
		}
	}

	init();
	resize();
	draw();

	return {
		getStartTimeAsString: getStartTimeAsString,
		getStopTimeAsString: getStopTimeAsString,
		getStartTime: getStartTime,
		getStopTime: getStopTime,
		resize: resize,
		draw: draw
	};
}
