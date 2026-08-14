class AppNotification {
  final String id;
  final String type;
  final String title;
  final String message;
  final bool isRead;
  final DateTime createdAt;
  final String? link;

  const AppNotification({
    required this.id,
    required this.type,
    required this.title,
    required this.message,
    required this.isRead,
    required this.createdAt,
    this.link,
  });

  factory AppNotification.fromJson(Map<String, dynamic> j) => AppNotification(
        id: j['_id'] as String,
        type: j['type'] as String,
        title: j['title'] as String,
        message: j['message'] as String,
        isRead: j['isRead'] as bool? ?? false,
        createdAt: DateTime.parse(j['createdAt'] as String),
        link: j['link'] as String?,
      );
}
