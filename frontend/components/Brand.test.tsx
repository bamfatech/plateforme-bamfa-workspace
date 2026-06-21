import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Brand } from "./Brand";

describe("Brand", () => {
  it("affiche le nom BAMFA", () => {
    render(<Brand />);
    expect(screen.getByText("BAMFA")).toBeInTheDocument();
  });
});
