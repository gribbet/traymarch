import { Expression, expression, value, random, minNorm } from './expression';

export interface Shape {
	readonly call: (position: Expression) => Expression,
}

export function shape(call: (position: Expression) => Expression): Shape {
	return {
		call: call
	};
}

export function zero(): Shape {
	return shape(p =>
		expression(`MAX_VALUE`));
}

export function unit(): Shape {
	return shape(p =>
		expression(`-MAX_VALUE`));
}

export function sphere(): Shape {
	return shape(p =>
		expression(`length(${p}) - 0.5`));
}

export function plane(normal: Expression, offset: Expression): Shape {
	return shape(p =>
		expression(`dot(${p}, ${normal}) + ${offset}.x`));
}

function unitShape(normals: Expression[]): Shape {
	return normals.reduce((s, n) =>
		intersection(s,
			plane(n, value(-0.5))),
		unit());
}

export function tetrahedron(): Shape {
	let l = Math.sqrt(3);
	return unitShape([
		value(-1 / l, -1 / l, -1 / l),
		value(-1 / l, 1 / l, 1 / l),
		value(1 / l, -1 / l, 1 / l),
		value(1 / l, 1 / l, -1 / l),
	]);
}

export function cube(): Shape {
	return unitShape([
		value(1, 0, 0),
		value(-1, 0, 0),
		value(0, 1, 0),
		value(0, -1, 0),
		value(0, 0, 1),
		value(0, 0, -1)
	]);
}

export function Octohedron(): Shape {
	let l = Math.sqrt(3);
	return unitShape([
		value(1 / l, 1 / l, 1 / l),
		value(1 / l, 1 / l, -1 / l),
		value(1 / l, -1 / l, 1 / l),
		value(1 / l, -1 / l, -1 / l),
		value(-1 / l, 1 / l, 1 / l),
		value(-1 / l, 1 / l, -1 / l),
		value(-1 / l, -1 / l, 1 / l),
		value(-1 / l, -1 / l, -1 / l),
	]);
}

export function dodecahedron(): Shape {
	let phi = 0.5 * (1 + Math.sqrt(5));
	let l = Math.sqrt(phi * phi + 1);
	return unitShape([
		value(phi / l, 1 / l, 0),
		value(phi / l, -1 / l, 0),
		value(0, phi / l, 1 / l),
		value(0, phi / l, -1 / l),
		value(1 / l, 0, phi / l),
		value(-1 / l, 0, phi / l),
		value(-phi / l, 1 / l, 0),
		value(-phi / l, -1 / l, 0),
		value(0, -phi / l, 1 / l),
		value(0, -phi / l, -1 / l),
		value(1 / l, 0, -phi / l),
		value(-1 / l, 0, -phi / l)
	]);
}



export function cylinder(): Shape {
	return shape(p =>
		expression(`length(${p}.xz) - 0.5`));
}

export function torus(): Shape {
	return shape(p =>
		expression(`length(vec2(length(${p}.xz) - 0.5, ${p}.y)) - 0.1`));
}

export function translate(x: Expression, a: Shape): Shape {
	return shape(p =>
		a.call(expression(`${p} - ${x}`)));
}

export function scale(x: Expression, a: Shape): Shape {
	return shape(p => {
		let q = a.call(expression(`${p} / ${x}.x`));
		return expression(`${q} * ${x}.x`);
	});
}

export function spheroid(x: (p: Expression) => Expression) {
	return shape(p => expression(`length(${p}) - ${x(p)}`));
}

export function max(a: Shape): Shape {
	return shape(p =>
		a.call(expression(`max(${p}, 0.0)`)));
}

export function stretch(x: Expression, a: Shape): Shape {
	return shape(p =>
		expression(`${a.call(expression(`${p} / ${x}`))} * ${minNorm(x)}`));
}

export function repeat(x: Expression, a: Shape): Shape {
	return shape(p =>
		a.call(expression(`mod(${p} - ${x} * 0.5, ${x}) - ${x} * 0.5`)));
}

export function union(a: Shape, b: Shape): Shape {
	return shape(p => {
		let da = a.call(p);
		let db = b.call(p);
		return expression(`min(${da}, ${db})`)
	});
}

export function intersection(a: Shape, b: Shape): Shape {
	return shape(p => {
		let da = a.call(p);
		let db = b.call(p);
		return expression(`max(${da}, ${db})`)
	});
}

export function difference(a: Shape, b: Shape): Shape {
	return shape(p => {
		let da = a.call(p);
		let db = b.call(p);
		return expression(`max(${da}, -${db})`)
	});
}

function smoothMin(k: Expression, a: Expression, b: Expression): Expression {
	let h = expression(`clamp(0.5 + 0.5 * (${b} - ${a}) / ${k}, 0.0, 1.0)`);
	return expression(`mix(${b}, ${a}, ${h}) - ${k} * ${h} * (1.0 - ${h})`);
}

function smoothMax(k: Expression, a: Expression, b: Expression): Expression {
	let h = expression(`clamp(0.5 - 0.5 * (${b} - ${a}) / ${k}, 0.0, 1.0)`);
	return expression(`mix(${b}, ${a}, ${h}) + ${k} * ${h} * (1.0 - ${h})`);
}

export function smoothUnion(k: Expression, a: Shape, b: Shape): Shape {
	return shape(p =>
		smoothMin(k, a.call(p), b.call(p)));
}

export function smoothIntersection(k: Expression, a: Shape, b: Shape): Shape {
	return shape(p =>
		smoothMax(k, a.call(p), b.call(p)));
}

export function smoothDifference(k: Expression, a: Shape, b: Shape): Shape {
	return shape(p =>
		smoothMax(k, a.call(p), expression(`${b.call(p)} * -1.0`)));
}

export function expand(k: Expression, a: Shape): Shape {
	return shape(p => {
		let da = a.call(p);
		return expression(`${da} - ${k}.x`)
	});
}

export function twistX(x: Expression, a: Shape): Shape {
	return shape(p =>
		rotateX(expression(`vec3(${p}.x * ${x}.x)`), a).call(p));
}

export function twistY(x: Expression, a: Shape): Shape {
	return shape(p =>
		rotateY(expression(`vec3(${p}.y * ${x}.x)`), a).call(p));
}

export function twistZ(x: Expression, a: Shape): Shape {
	return shape(p =>
		rotateZ(expression(`vec3(${p}.z * ${x}.x)`), a).call(p));
}

export function rotateX(x: Expression, a: Shape): Shape {
	return shape(p => {
		let c = expression(`cos(${x}.x), sin(${x}.x), 0`);
		return a.call(expression(`mat3(1, 0, 0, 0, ${c}.x, ${c}.y, 0, -${c}.y, ${c}.x) * ${p}`))
	});
}

export function rotateY(x: Expression, a: Shape): Shape {
	return shape(p => {
		let c = expression(`cos(${x}.x), sin(${x}.x), 0`);
		return a.call(expression(`mat3(${c}.x, 0, -${c}.y, 0, 1, 0, ${c}.y, 0, ${c}.x) * ${p}`))
	});
}

export function rotateZ(x: Expression, a: Shape): Shape {
	return shape(p => {
		let c = expression(`cos(${x}.x), sin(${x}.x), 0`);
		return a.call(expression(`mat3(${c}.x, ${c}.y, 0, -${c}.y, ${c}.x, 0, 0, 0, 1) * ${p}`))
	});
}

export function rotate(axis: Expression, x: Expression, a: Shape): Shape {
	return shape(p => {
		let u = expression(`normalize(${axis})`);
		let c = expression(`cos(${x}.x), sin(${x}.x), 0`);
		return a.call(expression(`mat3(
			${c}.x + ${u}.x * ${u}.x * (1.0 - ${c}.x), 
			${u}.x * ${u}.y * (1.0 - ${c}.x) - ${u}.z * ${c}.y,
			${u}.x * ${u}.z * (1.0 - ${c}.x) + ${u}.y * ${c}.y,
			${u}.y * ${u}.x * (1.0 - ${c}.x) + ${u}.z * ${c}.y,
			${c}.x + ${u}.y * ${u}.y * (1.0 - ${c}.x),
			${u}.x * ${u}.y * (1.0 - ${c}.x) - ${u}.x * ${c}.y,
			${u}.z * ${u}.x * (1.0 - ${c}.x) - ${u}.y * ${c}.y,
			${u}.z * ${u}.y * (1.0 - ${c}.x) + ${u}.x * ${c}.y,
			${c}.x +  ${u}.z * ${u}.z * (1.0 - ${c}.x)) * ${p}`));
	});
}

export function wrapX(a: Shape): Shape {
	return shape(p => {
		let c = expression(`length(${p}.yz)`);
		let q = expression(`1, 1, max(0.01, abs(${p}.z))`);
		//let q = value(1);
		return expression(`${a.call(expression(`${p}.x, asin(${p}.y / ${c}.x), ${c}.x`))} * ${minNorm(q)}`);
	});
}

export function mirror(n: Expression, a: Shape): Shape {
	return shape(p =>
		a.call(expression(`${p} - 2.0 * min(0.0, dot(${p}, ${n})) * ${n}`)));
}

export function offset(x: (p: Expression) => Expression, a: Shape): Shape {
	return shape(p => a.call(expression(`${p} - ${x(p)}`)));
}

export function smoothBox(dimensions: Expression, radius: Expression): Shape {
	return mirror(value(1, 0, 0),
		mirror(value(0, 1, 0),
			mirror(value(0, 0, 1),
				translate(expression(`0.5 * (${dimensions} - ${radius})`),
					max(
						scale(radius,
							sphere()))))));
}

export function box(dimensions: Expression): Shape {
	return shape(p => {
		const d = expression(`abs(${p}) - ${dimensions}`);
		return expression(`max(min(${d}.x, min(${d}.y, ${d}.z)), 0.0) + length(max(${d}, 0.0))`);
	});
}

export function sierpinski(iterations: number = 5, a: Shape = tetrahedron()): Shape {
	let l = Math.sqrt(2);
	return Array(iterations)
		.fill(0)
		.reduce((shape, i) =>
			mirror(value(1 / l, 1 / l, 0),
				mirror(value(0, 1 / l, 1 / l),
					mirror(value(1 / l, 0, 1 / l),
						scale(value(0.5),
							translate(value(0.5 * Math.sqrt(3)),
								shape))))), a);
}

export function tree(iterations: number = 8): Shape {
	let factor = 0.58;
	let length = 1.2;
	let width = 0.1;
	let angle = 50;

	return Array(iterations)
		.fill(0)
		.reduce((shape, _, i) =>
			smoothUnion(
				value(0.15 * Math.pow(factor, i)),
				shape,
				mirror(value(1 / Math.sqrt(2), 0, 1 / Math.sqrt(2)),
					mirror(value(1 / Math.sqrt(2), 0, -1 / Math.sqrt(2)),
						translate(
							value(
								length * factor / 2 * Math.sin(angle / 180 * Math.PI),
								length / 2 * (1 + factor / 2 * Math.cos(angle / 180 * Math.PI)),
								0),
							scale(value(factor),
								rotateY(value(0.1),
									rotateZ(value(angle / 180 * Math.PI),
										shape))))))),
		smoothBox(value(width, length, width), value(width / 2)));
}

export function modulate(
	x: Expression,
	a: (index: Expression) => Shape,
	buffer: Expression = value(0.01)): Shape {
	return shape(p => {
		let offset = expression(`${p} + ${x} * 0.5`);
		let index = expression(`floor(${offset} / ${x})`);
		let center = expression(`${index} * ${x}`);
		let local = expression(`${p} - ${center}`);
		let mask = shape(p => {
			let a = expression(`${buffer} + ${x} * 0.5 - abs(${p})`);
			return expression(`min(min(${a}.x, ${a}.y), ${a}.z)`);
		});
		return union(mask, a(index))
			.call(local);
	});
}

export function choose(x: Expression, shapes: Shape[]): Shape {
	return shape(p => {
		return expression(shapes
			.map(_ => _.call(p))
			.reduce((code, d, i) =>
				code + `${x}.x < ${((i + 1) / shapes.length).toPrecision(6)} ? ${d} : `, "") + "vec3(0)");
	});
}

export function truchet(): Shape {
	let base = intersection(cube(), union(union(
		translate(value(0.5, 0, 0.5), torus()),
		translate(value(-0.5, 0.5, 0),
			rotateX(value(Math.PI / 2),
				torus()))),
		translate(value(0, -0.5, -0.5),
			rotateZ(value(Math.PI / 2),
				torus()))));
	return modulate(value(1, 1, 1), index =>
		choose(random(index), [
			base,
			rotateX(value(Math.PI / 2), base),
			rotateX(value(Math.PI), base),
			rotateX(value(3 * Math.PI / 2), base)
		]));
}

export function skull(): Shape {
	let skull =
		translate(value(0, 0.05, 0),
			spheroid(p => expression(`0.333 * cos(cos(${p}.y * 11.0 + 0.55) * ${p}.z * 2.3)`)));

	const globeFront = translate(
		value(0.1, 0.23, 0),
		scale(value(0.574), sphere()));
	skull = smoothUnion(value(0.09), skull, globeFront);

	const globeBack = translate(
		value(-0.1, 0.24, 0),
		scale(value(0.574), sphere()));
	skull = smoothUnion(value(0.09), skull, globeBack);

	const eyeBrow = translate(value(0.24, 0.07, 0.1),
		spheroid(p => expression(`0.126 * cos(${p}.y * 7.0 + 0.49)`)));
	skull = smoothUnion(value(0.02), skull, eyeBrow);

	const lateralHole = translate(value(0.15, -0.01, 0.31),
		spheroid(p => expression(`0.098 * cos(${p}.x * 0.59 + 0.089)`)));
	skull = smoothDifference(value(0.02), skull, lateralHole);

	const cheekBone = translate(value(0.21, -0.13, 0.18),
		scale(value(0.077), sphere()));
	skull = smoothUnion(value(0.04), skull, cheekBone);

	let inside = translate(value(0, 0.05, 0),
		spheroid(p => expression(`0.315 * cos(cos(${p}.y * 11.0 + 0.55) * ${p}.z * 2.3)`)))
	inside = smoothUnion(value(0.02),
		inside,
		translate(value(0.10, 0.23, 0),
			scale(value(0.511),
				sphere())));
	inside = smoothUnion(value(0.02),
		inside, translate(value(-0.1, 0.24, 0),
			scale(value(0.511),
				sphere())));
	inside = smoothUnion(value(0.02),
		inside,
		translate(value(0, 0.24, 0),
			scale(value(0.511),
				sphere())));
	skull = smoothDifference(value(0.02), skull, inside);

	const eyeBall = translate(value(0.32, -0.04, 0.140),
		spheroid(p => expression(`0.098 * cos(${p}.y * 10.0 - 0.04)`)))
	skull = smoothDifference(value(0.03), skull, eyeBall);

	let nose = translate(
		value(0.22, -0.05, 0),
		spheroid(p => expression(`0.123 * cos(sin(${p}.y * 22.0 - 1.1) * ${p}.z * 24.0)`)));
	nose = smoothDifference(value(0.02),
		nose,
		translate(value(0.32, -0.04, 0.140),
			spheroid(p => expression(`0.123 * cos(${p}.y * 10.0 - 0.4)`))));
	nose = smoothDifference(value(0.02),
		nose,
		translate(value(0, 0.05, 0),
			spheroid(p => expression(`0.32 * cos(cos(${p}.y * 11.0 + 0.5) * ${p}.z * 2.3)`))));
	skull = smoothUnion(value(0.015), skull, nose);

	const noseInside = translate(value(0.228, -0.09, 0),
		spheroid(p => expression(`0.11 * cos(sin(${p}.y * 18.0 - 1.62) * ${p}.z * 29.0)`)));
	skull = smoothDifference(value(0.005),
		skull,
		noseInside);

	const cut = translate(value(-0.15, -0.97, 0),
		scale(value(1.75),
			sphere()));
	skull = smoothDifference(value(0.01), skull, cut);

	let upperJaw = translate(value(0.13, -0.26, 0),
		scale(value(0.315),
			sphere()));
	upperJaw = smoothDifference(value(0.01),
		upperJaw,
		translate(value(0.125, -0.3, 0),
			scale(value(0.28),
				sphere())));
	upperJaw = smoothDifference(value(0.03),
		upperJaw,
		translate(value(-0.2, -0.1, 0),
			scale(value(0.63),
				sphere())));
	upperJaw = smoothDifference(value(0.03),
		upperJaw,
		translate(value(0.13, -0.543, 0),
			scale(value(0.63),
				sphere())));
	upperJaw = difference(
		upperJaw,
		translate(value(0, 0.02, 0),
			spheroid(p => expression(`0.315 * cos(cos(${p}.y * 11.0 + 0.22) * ${p}.z * 2.3)`))));
	skull = smoothUnion(value(0.04), skull, upperJaw);

	let lowerJaw = translate(value(0.1, -0.32, 0),
		scale(value(0.301),
			sphere()));
	lowerJaw = smoothDifference(value(0.02),
		lowerJaw,
		translate(value(0.1, -0.32, 0),
			scale(value(0.259),
				sphere())));
	lowerJaw = smoothDifference(value(0.02),
		lowerJaw,
		translate(value(0.1, -0.034, 0),
			scale(value(0.721),
				sphere())));
	lowerJaw = smoothDifference(value(0.02),
		lowerJaw,
		translate(value(0, -0.4, 0),
			scale(value(0.245),
				sphere())));
	lowerJaw = smoothUnion(value(0.13),
		lowerJaw,
		offset(p => expression(`0.04 - 0.03 * cos(${p}.y * 20.2), -0.23, 0.27 + sin(${p}.y) * 0.27`),
			box(value(0.03, 0.12, 0.014))));
	lowerJaw = difference(
		lowerJaw,
		translate(value(0, 0.153, 0.2),
			scale(value(0.595),
				sphere())));
	lowerJaw = smoothUnion(
		value(0.08),
		lowerJaw,
		translate(value(0.19, -0.44, 0.05),
			scale(value(0.035),
				sphere())));
	skull = smoothUnion(value(0.02), skull, lowerJaw);

	let teeth = translate(value(0.26, -0.29, 0.018), scale(value(0.0371), sphere()));
	teeth = union(teeth, translate(value(0.25, -0.288, 0.05), scale(value(0.035), sphere())));;
	teeth = union(teeth, translate(value(0.235, -0.29, 0.08), scale(value(0.035), sphere())));;
	teeth = union(teeth, translate(value(0.215, -0.285, 0.1), scale(value(0.035), sphere())));;
	teeth = difference(teeth, translate(value(0.16, -0.35, 0), scale(value(0.231), sphere())));;
	teeth = union(teeth, translate(value(0.18, -0.28, 0.115), scale(value(0.035), sphere())));;
	teeth = union(teeth, translate(value(0.14, -0.28, 0.115), scale(value(0.042), sphere())));;
	teeth = union(teeth, translate(value(0.11, -0.28, 0.115), scale(value(0.042), sphere())));;
	teeth = union(teeth, translate(value(0.08, -0.28, 0.115), scale(value(0.042), sphere())));;
	skull = smoothUnion(value(0.03), skull, teeth);

	teeth = translate(value(0.23, -0.34, 0.018), scale(value(0.0371), sphere()));
	teeth = union(teeth, translate(value(0.22, -0.34, 0.048), scale(value(0.0353), sphere())));;
	teeth = union(teeth, translate(value(0.20, -0.345, 0.078), scale(value(0.0353), sphere())));;
	teeth = union(teeth, translate(value(0.17, -0.35, 0.098), scale(value(0.0353), sphere())));;
	teeth = union(teeth, translate(value(0.14, -0.35, 0.11), scale(value(0.0353), sphere())));;
	teeth = union(teeth, translate(value(0.11, -0.35, 0.11), scale(value(0.0353), sphere())));;
	teeth = union(teeth, translate(value(0.08, -0.35, 0.11), scale(value(0.0353), sphere())));;
	skull = smoothUnion(value(0.025), skull, teeth);

	skull = mirror(value(0, 0, 1), skull);

	return skull;
}