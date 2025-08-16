import { useEffect } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export const useScrollTrigger = () => {
  useEffect(() => {
    ScrollTrigger.refresh();
  }, []);
};
