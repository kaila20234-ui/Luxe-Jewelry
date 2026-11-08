import 'dart:developer' as developer;
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../services/auth_service.dart';
import '../services/api_config.dart';

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  late Future<List<Order>> futureOrders;
  int _selectedTab = 0;
  final authService = AuthService();

  final List<String> tabs = ['Processing', 'Delivered', 'Paid', 'Cancelled'];

  @override
  void initState() {
    super.initState();
    futureOrders = fetchOrders();
  }

  Future<List<Order>> fetchOrders() async {
    try {
      final token = await authService.getToken();
      if (token == null) {
        developer.log('[ORDERS] No auth token found', name: 'OrdersScreen');
        return [];
      }

      final response = await http
          .get(
            ApiConfig.uri('customer/orders'),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $token',
            },
          )
          .timeout(const Duration(seconds: 60));

      developer.log(
        '[ORDERS] Response status: ${response.statusCode}',
        name: 'OrdersScreen',
      );
      developer.log(
        '[ORDERS] Response body: ${response.body}',
        name: 'OrdersScreen',
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final List<dynamic> orders = data['orders'] ?? data['data'] ?? [];
        return orders.map((o) => Order.fromJson(o)).toList();
      } else if (response.statusCode == 401) {
        developer.log(
          '[ORDERS] Unauthorized - user not logged in',
          name: 'OrdersScreen',
        );
        return [];
      } else {
        throw Exception('Failed to load orders: ${response.statusCode}');
      }
    } catch (e) {
      developer.log('[ORDERS] Error fetching orders: $e', name: 'OrdersScreen');
      return [];
    }
  }

  List<Order> getFilteredOrders(List<Order> orders) {
    switch (_selectedTab) {
      case 0: // Processing
        return orders
            .where((o) => o.status.toLowerCase() == 'processing')
            .toList();
      case 1: // Delivered
        return orders
            .where((o) => o.status.toLowerCase() == 'delivered')
            .toList();
      case 2: // Paid
        return orders.where((o) => o.status.toLowerCase() == 'paid').toList();
      case 3: // Cancelled
        return orders
            .where((o) => o.status.toLowerCase() == 'cancelled')
            .toList();
      default:
        return orders;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Orders'),
        backgroundColor: const Color(0xFFd4af37),
        foregroundColor: Colors.white,
      ),
      body: Column(
        children: [
          // Tab Bar
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: List.generate(
                tabs.length,
                (index) => Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  child: FilterChip(
                    label: Text(tabs[index]),
                    selected: _selectedTab == index,
                    onSelected: (selected) {
                      setState(() {
                        _selectedTab = index;
                      });
                    },
                    backgroundColor: Colors.grey[200],
                    selectedColor: const Color(0xFFd4af37),
                    labelStyle: TextStyle(
                      color: _selectedTab == index
                          ? Colors.white
                          : Colors.black,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
            ),
          ),
          // Orders List
          Expanded(
            child: FutureBuilder<List<Order>>(
              future: futureOrders,
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(
                    child: CircularProgressIndicator(color: Color(0xFFd4af37)),
                  );
                }

                if (snapshot.hasError) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(
                          Icons.error_outline,
                          size: 48,
                          color: Colors.red,
                        ),
                        const SizedBox(height: 12),
                        Text('Error: ${snapshot.error}'),
                      ],
                    ),
                  );
                }

                if (!snapshot.hasData || snapshot.data!.isEmpty) {
                  return const Center(child: Text('No orders yet'));
                }

                final allOrders = snapshot.data!;
                final filteredOrders = getFilteredOrders(allOrders);

                if (filteredOrders.isEmpty) {
                  return Center(
                    child: Text(
                      'No ${tabs[_selectedTab].toLowerCase()} orders',
                    ),
                  );
                }

                return ListView.builder(
                  padding: const EdgeInsets.all(12),
                  itemCount: filteredOrders.length,
                  itemBuilder: (context, index) {
                    final order = filteredOrders[index];
                    return OrderCard(order: order);
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class Order {
  final String id;
  final String status;
  final double total;
  final DateTime date;
  final List<OrderItem> items;
  final String? paymentMethod;

  Order({
    required this.id,
    required this.status,
    required this.total,
    required this.date,
    required this.items,
    this.paymentMethod,
  });

  factory Order.fromJson(Map<String, dynamic> json) {
    return Order(
      id: json['_id'] ?? json['id'] ?? '',
      status: json['status'] ?? 'pending',
      total: (json['total'] ?? 0).toDouble(),
      date: DateTime.parse(json['createdAt'] ?? DateTime.now().toString()),
      items:
          (json['items'] as List?)
              ?.map((i) => OrderItem.fromJson(i))
              .toList() ??
          [],
      paymentMethod: json['paymentMethod'],
    );
  }
}

class OrderItem {
  final String name;
  final int quantity;
  final double price;

  OrderItem({required this.name, required this.quantity, required this.price});

  factory OrderItem.fromJson(Map<String, dynamic> json) {
    return OrderItem(
      name: json['name'] ?? json['productName'] ?? 'Product',
      quantity: json['quantity'] ?? 1,
      price: (json['price'] ?? 0).toDouble(),
    );
  }
}

class OrderCard extends StatelessWidget {
  final Order order;

  const OrderCard({required this.order, super.key});

  Color getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'delivered':
        return Colors.green;
      case 'processing':
        return Colors.blue;
      case 'paid':
        return Colors.orange;
      case 'cancelled':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  Color getStatusBackgroundColor(String status) {
    switch (status.toLowerCase()) {
      case 'delivered':
        return const Color.fromRGBO(0, 128, 0, 0.2);
      case 'processing':
        return const Color.fromRGBO(0, 0, 255, 0.2);
      case 'paid':
        return const Color.fromRGBO(255, 165, 0, 0.2);
      case 'cancelled':
        return const Color.fromRGBO(255, 0, 0, 0.2);
      default:
        return const Color.fromRGBO(128, 128, 128, 0.2);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 2,
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Order Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Order #${order.id.substring(0, 8).toUpperCase()}',
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${order.date.day}/${order.date.month}/${order.date.year}',
                        style: const TextStyle(
                          fontSize: 12,
                          color: Colors.grey,
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: getStatusBackgroundColor(order.status),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    order.status.toUpperCase(),
                    style: TextStyle(
                      color: getStatusColor(order.status),
                      fontWeight: FontWeight.bold,
                      fontSize: 11,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            // Order Items
            ...order.items.asMap().entries.map((entry) {
              final item = entry.value;
              return Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        '${item.name} x${item.quantity}',
                        style: const TextStyle(fontSize: 13),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      '\$${(item.price * item.quantity).toStringAsFixed(2)}',
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              );
            }),
            const Divider(height: 24),
            // Order Total
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Total',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                ),
                Text(
                  '\$${order.total.toStringAsFixed(2)}',
                  style: const TextStyle(
                    color: Color(0xFFd4af37),
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            // Action Button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(
                        'Order #${order.id.substring(0, 8)} details',
                      ),
                      backgroundColor: const Color(0xFFd4af37),
                    ),
                  );
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFd4af37),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                child: const Text(
                  'View Details',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
