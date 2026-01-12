-- Grant execute permission on resolve_role_by_phone to authenticated users
GRANT EXECUTE ON FUNCTION public.resolve_role_by_phone(text) TO authenticated;

-- Also ensure the normalize_pk_phone_digits function is accessible
GRANT EXECUTE ON FUNCTION public.normalize_pk_phone_digits(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;