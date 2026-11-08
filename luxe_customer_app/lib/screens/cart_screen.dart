import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../services/auth_service.dart';
import '../services/api_config.dart';

class CartScreen extends StatefulWidget {
  const CartScreen({super.key});

  @override
  State<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends State<CartScreen> {
  List<CartItem> cartItems = [];
  bool isLoading = true;
  final authService = AuthService();

  @override
  void initState() {
    super.initState();
    loadCart();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // Reload cart when screen comes back into focus
    loadCart();
  }

  Future<void> loadCart() async {
    try {
      final token = await authService.getToken();

      if (token == null) {
        setState(() {
          isLoading = false;
          cartItems = [];
        });
        return;
      }

      final response = await http
          .get(
            ApiConfig.uri('customer/cart'),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $token',
            },
          )
          .timeout(const Duration(seconds: 60));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final List<dynamic> items = data['items'] ?? data['cart'] ?? [];

        setState(() {
          cartItems = items
              .map(
                (i) => CartItem(
                  id: i['_id'] ?? i['id'] ?? '',
                  name: i['name'] ?? i['productName'] ?? 'Product',
                  price: (i['price'] ?? 0).toDouble(),
                  quantity: i['qty'] ?? i['quantity'] ?? 1,
                ),
              )
              .toList();
          isLoading = false;
        });
      } else if (response.statusCode == 401) {
        setState(() {
          cartItems = [];
          isLoading = false;
        });
      } else {
        throw Exception('Failed to load cart: ${response.statusCode}');
      }
    } catch (e) {
      setState(() {
        cartItems = [];
        isLoading = false;
      });
    }
  }

  Future<void> updateQuantity(String itemId, int newQuantity) async {
    try {
      final token = await authService.getToken();
      if (token == null) return;

      final response = await http
          .put(
            ApiConfig.uri('customer/cart/$itemId'),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $token',
            },
            body: jsonEncode({'qty': newQuantity}),
          )
          .timeout(const Duration(seconds: 60));

      if (response.statusCode == 200) {
        await loadCart();
      }
    } catch (e) {
      // Log or handle update quantity failure
    }
  }

  Future<void> removeItem(String itemId) async {
    try {
      final token = await authService.getToken();
      if (token == null) return;

      final response = await http
          .delete(
            ApiConfig.uri('customer/cart/$itemId'),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $token',
            },
          )
          .timeout(const Duration(seconds: 60));

      if (response.statusCode == 200) {
        await loadCart();
      }
    } catch (e) {
      // Log or handle remove item failure
    }
  }

  double get subtotal {
    return cartItems.fold(0, (sum, item) => sum + (item.price * item.quantity));
  }

  double get tax {
    return subtotal * 0.1;
  }

  double get total {
    return subtotal + tax;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Shopping Cart'),
        backgroundColor: const Color(0xFFd4af37),
        foregroundColor: Colors.white,
      ),
      body: isLoading
          ? const Center(
              child: CircularProgressIndicator(color: Color(0xFFd4af37)),
            )
          : cartItems.isEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(
                    Icons.shopping_cart_outlined,
                    size: 80,
                    color: Color(0xFFd4af37),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Your cart is empty',
                    style: TextStyle(fontSize: 18),
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton(
                    onPressed: () {
                      // Navigate to shop screen
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFd4af37),
                    ),
                    child: const Text(
                      'Continue Shopping',
                      style: TextStyle(color: Colors.white),
                    ),
                  ),
                ],
              ),
            )
          : Column(
              children: [
                // Cart Items
                Expanded(
                  child: ListView.builder(
                    padding: const EdgeInsets.all(12),
                    itemCount: cartItems.length,
                    itemBuilder: (context, index) {
                      final item = cartItems[index];
                      return Card(
                        margin: const EdgeInsets.only(bottom: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Row(
                            children: [
                              // Product Image
                              Container(
                                width: 80,
                                height: 80,
                                decoration: BoxDecoration(
                                  color: Colors.grey[200],
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: const Icon(
                                  Icons.diamond,
                                  size: 40,
                                  color: Color(0xFFd4af37),
                                ),
                              ),
                              const SizedBox(width: 12),
                              // Product Details
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      item.name,
                                      style: const TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 14,
                                      ),
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    const SizedBox(height: 8),
                                    Text(
                                      '\$${item.price.toStringAsFixed(2)}',
                                      style: const TextStyle(
                                        color: Color(0xFFd4af37),
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              // Quantity Controls
                              Column(
                                children: [
                                  GestureDetector(
                                    onTap: () {
                                      if (item.quantity > 1) {
                                        updateQuantity(
                                          item.id,
                                          item.quantity - 1,
                                        );
                                      } else {
                                        removeItem(item.id);
                                      }
                                    },
                                    child: const Icon(
                                      Icons.remove_circle_outline,
                                      size: 20,
                                      color: Color(0xFFd4af37),
                                    ),
                                  ),
                                  Padding(
                                    padding: const EdgeInsets.symmetric(
                                      vertical: 4,
                                    ),
                                    child: Text(
                                      '${item.quantity}',
                                      style: const TextStyle(
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                  GestureDetector(
                                    onTap: () {
                                      updateQuantity(
                                        item.id,
                                        item.quantity + 1,
                                      );
                                    },
                                    child: const Icon(
                                      Icons.add_circle_outline,
                                      size: 20,
                                      color: Color(0xFFd4af37),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
                // Cart Summary
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.grey[100],
                    borderRadius: const BorderRadius.vertical(
                      top: Radius.circular(16),
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Subtotal:'),
                          Text(
                            '\$${subtotal.toStringAsFixed(2)}',
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Tax (10%):'),
                          Text(
                            '\$${tax.toStringAsFixed(2)}',
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                      const Divider(height: 24),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'Total:',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                          ),
                          Text(
                            '\$${total.toStringAsFixed(2)}',
                            style: const TextStyle(
                              color: Color(0xFFd4af37),
                              fontWeight: FontWeight.bold,
                              fontSize: 18,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(
                                'Proceeding to checkout - Total: \$${total.toStringAsFixed(2)}',
                              ),
                              backgroundColor: const Color(0xFFd4af37),
                            ),
                          );
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFd4af37),
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                        ),
                        child: const Text(
                          'Proceed to Checkout',
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
    );
  }
}

class CartItem {
  final String id;
  final String name;
  final double price;
  int quantity;

  CartItem({
    required this.id,
    required this.name,
    required this.price,
    required this.quantity,
  });
}
