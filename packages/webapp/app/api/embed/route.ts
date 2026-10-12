/** This route handler is used to return an oEmbed response for embeddable widgets. */
export async function GET(req: Request) {
  const response = {
    type: 'rich',
    version: '1.0',
    //    html: '<iframe src="https://podchatstudio.com/embed/chat/omnibus" width="100%" height="600" frameborder="0" scrolling="no"></iframe>',
    html: '<div>This is a test from Podchat Studio.</div>',
    width: 600,
    height: 400,
  };
  return new Response(JSON.stringify(response), {
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
