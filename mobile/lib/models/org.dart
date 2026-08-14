class OrgConfig {
  final String slug;
  final String name;
  final String? logoUrl;
  final String primaryColor;
  final bool mobileEnabled;

  const OrgConfig({
    required this.slug,
    required this.name,
    this.logoUrl,
    this.primaryColor = '#4F378A',
    this.mobileEnabled = true,
  });

  factory OrgConfig.fromJson(Map<String, dynamic> json) => OrgConfig(
        slug: json['slug'] as String,
        name: json['name'] as String,
        logoUrl: json['logoUrl'] as String?,
        primaryColor:
            (json['settings']?['primaryColor'] as String?) ?? '#4F378A',
        mobileEnabled: (json['mobile']?['enabled'] as bool?) ?? true,
      );

  /// Parse from QR payload (base64-encoded JSON from backend)
  factory OrgConfig.fromQrPayload(Map<String, dynamic> json) => OrgConfig(
        slug: json['slug'] as String,
        name: json['name'] as String,
        logoUrl: json['logoUrl'] as String?,
        primaryColor: (json['primaryColor'] as String?) ?? '#4F378A',
      );
}
