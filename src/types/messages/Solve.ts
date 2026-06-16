class SolveMessage {
  public hostname: string;
  public sitekey: string;

  constructor(hostname: string, sitekey: string) {
    this.hostname = hostname;
    this.sitekey = sitekey;
  }
}

export { SolveMessage };
