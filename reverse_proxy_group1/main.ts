import { concat } from "https://deno.land/std@0.223.0/bytes/concat.ts";
import { indexOfNeedle } from "https://deno.land/std@0.223.0/bytes/mod.ts";

// POST /test HTTP/1.1\r\n
// Host: example.com\r\n
// Content-Length: 26\r\n
// Content-Type: text/plain\r\n
// \r\n
// abcdefghijklmnopqrstuvwxyz

async function handleConnection(conn: Deno.Conn): Promise<void> {
  const buf = new Uint8Array(4096);
  let arr = new Uint8Array(0);
  const needle = new Uint8Array([0xd, 0xa, 0xd, 0xa]);
  let body_arr = new Uint8Array(0);
  let request = new Map();
  let needle_index = 0;
  while (true) {
      const nbytes = await conn.read(buf);
      if (nbytes === null) {
          break;
      }
      // await conn.write(buf.slice(0, nbytes));
      arr = concat([arr, buf.slice(0, nbytes)]);

      // L e n g t h :   4 \r \n \r \n b l a h
      //                   ^ needle            ^ nbytes
      
      needle_index = indexOfNeedle(arr, needle);
      if(needle_index != -1) {
        body_arr = arr.slice(needle_index + 4);
        break;
      }
  }
  

  let http_output = new TextDecoder().decode(arr);
  http_output = http_output.trim();
  let split_output = http_output.split("\r\n");
  
  console.log(split_output);
  for (let i = 1; i < split_output.length; i++) {
    let colonIndex = split_output[i].indexOf(":");
    request.set(split_output[i].slice(0, colonIndex).toLowerCase(), split_output[i].slice(colonIndex + 1).trim());
  }
  console.log(request);
  console.log(request.get("user-agent"));
  
  let remainingBodyLength = 0;
  if (request.get("content-length") !== undefined) {
    remainingBodyLength = request.get("content-length") - body_arr.length;
  }
  
  if (remainingBodyLength > 0) {
    while (true) {
      const nbytes = await conn.read(buf);
      if (nbytes === null) {
        break;
      }
      if(nbytes >= remainingBodyLength) {
        body_arr = concat([body_arr, buf.slice(0, remainingBodyLength)]);
        break;
      } else {
        body_arr = concat([body_arr, buf.slice(0, nbytes)]);
      }
      
      
      remainingBodyLength -= nbytes;
    }
  }
  
  const conn1 = await Deno.connect({ hostname: "example.com", port: 80 });

  const encoder = new TextEncoder();
  for (let [name, value] of request) {
    const data = encoder.encode(name + ": " + value);
    await conn1.write(data); 
  }
  


  console.log(body_arr);


  
  conn.close();
}

if (import.meta.main) {
  const listener = Deno.listen({ port: 8080 });

  for await (const conn of listener) {
      // we don't await this, why?
      handleConnection(conn);
  }
}
