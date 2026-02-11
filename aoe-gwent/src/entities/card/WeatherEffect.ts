import { Container, Sprite, Texture, Filter, GlProgram } from "pixi.js";
import { gsap } from "gsap";
import { CardEffect } from "../../local-server/CardDatabase";

/**
 * Weather effect overlay with shader-based animations
 */
export class WeatherEffect extends Container {
	private effectSprite: Sprite;
	private effect: CardEffect;
	private animationTween: GSAPTween | null = null;

	constructor(effect: CardEffect, width: number, height: number) {
		super();

		this.effect = effect;

		this.effectSprite = new Sprite(Texture.WHITE);
		this.effectSprite.width = width;
		this.effectSprite.height = height;
		this.effectSprite.anchor.set(0.5);

		this.addChild(this.effectSprite);

		this.setupShader();

		this.visible = false;
		this.eventMode = "none";
	}

	/**
	 * Show the weather effect
	 */
	public show(): void {
		if (this.animationTween) {
			this.animationTween.kill();
		}

		this.visible = true;
		this.alpha = 0;

		this.animationTween = gsap.to(this, {
			alpha: 1,
			duration: 2,
			ease: "power2.out",
		});
	}

	/**
	 * Hide the weather effect with fade out animation
	 */
	public hide(): void {
		if (this.animationTween) {
			this.animationTween.kill();
		}

		this.animationTween = gsap.to(this, {
			alpha: 0,
			duration: 0.4,
			ease: "power2.out",
			onComplete: () => {
				this.visible = false;
			},
		});
	}

	/**
	 * Start animating the shader
	 */
	private startShaderAnimation(): void {
		const filter = (this.effectSprite.filters as Filter[])[0];
		const weatherUniforms = filter.resources.weatherUniforms;

		if (!filter || !weatherUniforms) return;

		let time = 0;

		const animate = () => {
			if (!this.visible) {
				return;
			}

			time += 0.032;

			if (weatherUniforms.uniforms) {
				weatherUniforms.uniforms.uTime = time;
			}

			requestAnimationFrame(animate);
		};

		animate();
	}

	/**
	 * Setup the shader for the specific weather effect
	 */
	private setupShader(): void {
		const fragmentShader = this.getFragmentShader();

		const filter = new Filter({
			glProgram: GlProgram.from({
				vertex: `
					in vec2 aPosition;
					out vec2 vTextureCoord;
					
					uniform vec4 uInputSize;
					uniform vec4 uOutputFrame;
					uniform vec4 uOutputTexture;
					
					vec4 filterVertexPosition(void) {
						vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
						position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
						position.y = position.y * (2.0 * uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
						return vec4(position, 0.0, 1.0);
					}
					
					vec2 filterTextureCoord(void) {
						return aPosition * (uOutputFrame.zw * uInputSize.zw);
					}
					
					void main(void) {
						gl_Position = filterVertexPosition();
						vTextureCoord = filterTextureCoord();
					}
				`,
				fragment: fragmentShader,
			}),
			resources: {
				weatherUniforms: {
					uTime: { value: 0.0, type: "f32" },
				},
			},
		});

		this.effectSprite.filters = [filter];

		this.startShaderAnimation();
	}

	/**
	 * Get the fragment shader based on effect type
	 */
	private getFragmentShader(): string {
		switch (this.effect) {
			case CardEffect.FREEZE:
				return this.getFreezeShader();
			case CardEffect.FOG:
				return this.getFogShader();
			case CardEffect.RAIN:
				return this.getRainShader();
			default:
				return this.getRainShader();
		}
	}

	/**
	 * Freeze shader
	 */
	private getFreezeShader(): string {
		return `
			precision mediump float;
			in vec2 vTextureCoord;
			out vec4 finalColor;
			
			uniform float uTime;
			
			// Hash function for random-like values
			float hash(vec2 p) {
				return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
			}
			
			void main() {
				vec2 uv = fract(vTextureCoord);
				
				// Base icy blue color
				vec3 baseColor = vec3(0.4, 0.6, 0.8);
				
				// Create static ice crystals at random positions
				float crystals = 0.0;
				for(float i = 0.0; i < 20.0; i += 1.0) {
					vec2 pos = vec2(hash(vec2(i, 1.0)), hash(vec2(i, 2.0)));
					float dist = length(uv - pos);
					
					// Star-shaped crystal
					float angle = atan(uv.y - pos.y, uv.x - pos.x);
					float star = abs(sin(angle * 6.0));
					float crystal = smoothstep(0.02, 0.0, dist) * star;
					
					crystals += crystal;
				}
				
				// Blend crystals with base color
				vec3 crystalColor = vec3(0.8, 0.9, 1.0);
				vec3 finalRGB = mix(baseColor, crystalColor, crystals * 0.8);
				
				float alpha = 0.25 + crystals * 0.2;
				
				finalColor = vec4(finalRGB, alpha);
			}
		`;
	}

	/**
	 * Fog shader
	 */
	private getFogShader(): string {
		return `
			precision mediump float;
			in vec2 vTextureCoord;
			out vec4 finalColor;
			
			uniform float uTime;
			
			float hash(vec2 p) {
				return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
			}
			
			float noise(vec2 p) {
				vec2 i = floor(p);
				vec2 f = fract(p);
				f = f * f * (3.0 - 2.0 * f);
				
				float a = hash(i);
				float b = hash(i + vec2(1.0, 0.0));
				float c = hash(i + vec2(0.0, 1.0));
				float d = hash(i + vec2(1.0, 1.0));
				
				return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
			}
			
			// Fractal Brownian Motion for cloud-like patterns
			float fbm(vec2 p) {
				float value = 0.0;
				float amplitude = 0.5;
				float frequency = 1.0;
				
				for(int i = 0; i < 5; i++) {
					value += amplitude * noise(p * frequency);
					frequency *= 2.0;
					amplitude *= 0.5;
				}
				
				return value;
			}
			
			void main() {
				vec2 uv = fract(vTextureCoord);
				
				// Drifting fog layers with consistent scaling
				float fog1 = fbm(uv * 1.5 + vec2(uTime * 0.03, uTime * 0.015));
				float fog2 = fbm(uv * 1.8 + vec2(-uTime * 0.025, uTime * 0.02));
				float fog3 = fbm(uv * 2.1 + vec2(uTime * 0.028, -uTime * 0.012));
				
				// Combine fog layers with strong contrast
				float fogDensity = (fog1 * 0.4 + fog2 * 0.35 + fog3 * 0.25);
				
				// Strong smoothstep for dramatic contrast
				fogDensity = smoothstep(0.2, 0.8, fogDensity);
				fogDensity = pow(fogDensity, 1.5); // Enhance contrast
				
				// White fog with strong visibility
				vec3 lightFog = vec3(0.95, 0.95, 0.98);
				vec3 darkFog = vec3(0.3, 0.32, 0.35);
				vec3 fogColor = mix(darkFog, lightFog, fogDensity);
				
				// Lower alpha variation for better card visibility
				float alpha = 0.1 + fogDensity * 0.45;
				
				finalColor = vec4(fogColor, alpha);
			}
		`;
	}

	/**
	 * Rain shader
	 */
	private getRainShader(): string {
		return `
			precision mediump float;
			in vec2 vTextureCoord;
			out vec4 finalColor;
			
			uniform float uTime;
			
			float hash(vec2 p) {
				return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
			}
			
		// Rain streak function - thin angled lines
		float rain(vec2 uv, float t, float seed) {
			float n = 0.0;
			
			// Create multiple thin rain streaks
			for(float i = 0.0; i < 35.0; i += 1.0) {
				float column = (i + seed) / 35.0;
				float random = hash(vec2(column, seed));
				
				// Rain position with angle
				float dropX = column;
				float dropY = fract(t * (0.6 + random * 0.4) + random * 5.0);
				
				// Diagonal angle for rain movement
				float angleOffset = dropY * 0.08;
				float angleSlope = 0.08; // Slope of the rain line
				
				// Calculate distance from angled line
				// Transform UV to align with angled rain streak
				vec2 pos = vec2(uv.x - (dropX + angleOffset), uv.y - dropY);
				
				// Distance perpendicular to the angled line
				float perpDist = abs(pos.x - pos.y * angleSlope);
				// Distance along the line
				float alongDist = abs(pos.y);
				
				// Very thin angled line
				float streak = step(perpDist, 0.001); 
				streak *= smoothstep(0.2, 0.0, alongDist); // Length of streak
				
				n += streak;
			}
			
			return n;
		}
		
		void main() {
			vec2 uv = fract(vTextureCoord);
			
			// Multiple rain layers with moderate animation speed
			float rainLayer1 = rain(uv, uTime * 0.8, 1.0);
			float rainLayer2 = rain(uv, uTime * 0.95, 2.0);
			float rainLayer3 = rain(uv, uTime * 0.7, 3.0);
			
			float totalRain = (rainLayer1 + rainLayer2 * 0.8 + rainLayer3 * 0.6) * 0.25;
				vec3 baseColor = vec3(0.25, 0.3, 0.4);
				vec3 rainColor = vec3(0.65, 0.75, 0.95);
				
				vec3 finalRGB = mix(baseColor, rainColor, totalRain);
				
				float alpha = 0.25 + totalRain * 0.35;
				
				finalColor = vec4(finalRGB, alpha);
			}
		`;
	}
}
