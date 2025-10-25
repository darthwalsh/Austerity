import Library from "../cli/lib.js";

describe("CLI Library", () => {
  let lib;
  let mockReadline;
  let mockLog;

  beforeEach(() => {
    mockReadline = async (choices) => choices[0] || "default";
    mockLog = (message) => message; // Just return the message
    lib = new Library(mockReadline, mockLog);
  });

  it("should create library instance", () => {
    expect(lib).toBeDefined();
    expect(lib.db).toBeDefined();
  });

  it("should have correct database path", () => {
    expect(lib.db._path.pieces_).toEqual(["austerity"]);
  });

  it("should have required methods", () => {
    expect(typeof lib.connect).toBe("function");
    expect(typeof lib.close).toBe("function");
    expect(typeof lib.send).toBe("function");
  });
});
