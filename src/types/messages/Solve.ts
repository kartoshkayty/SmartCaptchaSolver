class SolveMessage {
  public hostname: string;
  public sitekey: string;
  public proxy: string;

  constructor(hostname: string, sitekey: string, proxy: string) {
    this.hostname = hostname;
    this.sitekey = sitekey;
    this.proxy = proxy;
  }
}

export { SolveMessage };
