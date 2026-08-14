class ChallanItem {
  final String name;
  final double amount;
  const ChallanItem({required this.name, required this.amount});
  factory ChallanItem.fromJson(Map<String, dynamic> j) => ChallanItem(
      name: j['name'] as String, amount: (j['amount'] as num).toDouble());
}

class Challan {
  final String id;
  final String month;
  final String challanNo;
  final List<ChallanItem> items;
  final double totalAmount;
  final double netAmount;
  final double paidAmount;
  final DateTime dueDate;
  final String status; // unpaid | partial | paid | waived | overdue

  const Challan({
    required this.id,
    required this.month,
    required this.challanNo,
    required this.items,
    required this.totalAmount,
    required this.netAmount,
    required this.paidAmount,
    required this.dueDate,
    required this.status,
  });

  double get balance => netAmount - paidAmount;
  bool get isPaid => status == 'paid' || status == 'waived';
  bool get isOverdue => status == 'overdue';

  factory Challan.fromJson(Map<String, dynamic> j) => Challan(
        id: j['_id'] as String,
        month: j['month'] as String,
        challanNo: j['challanNo'] as String,
        items: (j['items'] as List? ?? [])
            .map((i) => ChallanItem.fromJson(i as Map<String, dynamic>))
            .toList(),
        totalAmount: (j['totalAmount'] as num).toDouble(),
        netAmount: (j['netAmount'] as num).toDouble(),
        paidAmount: (j['paidAmount'] as num? ?? 0).toDouble(),
        dueDate: DateTime.parse(j['dueDate'] as String),
        status: j['status'] as String,
      );
}
