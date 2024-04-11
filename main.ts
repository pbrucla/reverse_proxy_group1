const listener = Deno.listen({ port: 8080 });
console.log("listening on 0.0.0.0:8080");
for await (const conn of listener) {
  const buf = new Uint8Array(4096);

  while (true){
    const buf_len = await conn.read(buf);

    if (buf_len!=null)
        await conn.write(buf.slice(0,buf_len));
    else{
        conn.close();
        break;
    }
  }
}