import { useMutation } from "@tanstack/react-query";
import {
  rotateCA,
  RotateCAFragment,
} from "../services/ca.service";

export function useRotateCA() {
  return useMutation({
    mutationFn: (
      fragments: RotateCAFragment[]
    ) => rotateCA(fragments),
  });
}