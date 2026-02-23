it('/v1/stellar/assets (GET)', async () => {
  const res = await request(app.getHttpServer()).get('/v1/stellar/assets?asset_code=USDC');
  expect(res.status).toBe(200);
  expect(res.body.version).toBe('v1');
});

it('/v2/stellar/assets (GET)', async () => {
  const res = await request(app.getHttpServer()).get('/v2/stellar/assets?asset_code=USDC&issuer=GA...');
  expect(res.status).toBe(200);
  expect(res.body.version).toBe('v2');
});
