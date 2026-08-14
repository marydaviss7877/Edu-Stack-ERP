import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/org.dart';
import '../core/storage/local_storage.dart';

class OrgNotifier extends StateNotifier<OrgConfig?> {
  OrgNotifier() : super(_loadFromStorage());

  static OrgConfig? _loadFromStorage() {
    final slug = LocalStorageService.orgSlug;
    final name = LocalStorageService.orgName;
    if (slug == null || name == null) return null;
    return OrgConfig(
      slug: slug,
      name: name,
      logoUrl: LocalStorageService.orgLogoUrl,
      primaryColor: LocalStorageService.orgPrimaryColor,
    );
  }

  void setOrg(OrgConfig org) {
    LocalStorageService.saveOrg(
      slug: org.slug,
      name: org.name,
      logoUrl: org.logoUrl,
      primaryColor: org.primaryColor,
    );
    state = org;
  }

  void clearOrg() {
    LocalStorageService.clearOrg();
    state = null;
  }
}

final orgProvider = StateNotifierProvider<OrgNotifier, OrgConfig?>(
  (_) => OrgNotifier(),
);
