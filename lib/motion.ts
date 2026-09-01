import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { Flip } from "gsap/Flip";

let registered = false;

export function registerMotion() {
  if (typeof window === "undefined") return;
  if (registered) return;
  gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText, Flip);
  gsap.defaults({ duration: 0.6, ease: "power2.out" });
  registered = true;
}

export { gsap, useGSAP, ScrollTrigger, SplitText, Flip };
