/**
 * group_admin has no fixed branchId — it oversees every branch in the org, and only
 * gets one (req.user.branchId) when it has entered a specific branch's view (X-Branch-Id
 * header, resolved in authenticate.ts). Every other role always has a real branchId.
 *
 * Building read filters as `{ orgId, branchId }` directly breaks group_admin: MongoDB's
 * BSON serialization treats an explicit `branchId: undefined` as "field must be BSON
 * Undefined", not "field omitted" — so it matches zero real documents instead of every
 * branch in the org. Use this helper for read/list filters so group_admin without an
 * active branch sees org-wide data, exactly like it does on the group dashboard.
 */
export function orgBranchScope(user: { orgId?: string; branchId?: string }): Record<string, unknown> {
  const scope: Record<string, unknown> = { orgId: user.orgId };
  if (user.branchId) scope.branchId = user.branchId;
  return scope;
}
