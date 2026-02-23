it('returns false for missing flag', async () => {
  jest.spyOn(repo, 'findOne').mockResolvedValue(null);
  expect(await service.isEnabled('UNKNOWN')).toBe(false);
});
it('returns true when flag enabled', async () => {
  jest.spyOn(repo, 'findOne').mockResolvedValue({ enabled: true } as any);
  expect(await service.isEnabled('NEW_CLAIMS')).toBe(true);
});
