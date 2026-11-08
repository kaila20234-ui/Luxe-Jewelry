import 'dart:developer' as developer;
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'shop_screen.dart';
import '../services/auth_service.dart';
import '../services/api_config.dart';

class ProductDetailScreen extends StatefulWidget {
  final Product product;

  const ProductDetailScreen({required this.product, super.key});

  @override
  State<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends State<ProductDetailScreen> {
  late PageController _imageController;
  int _currentImageIndex = 0;
  late Future<List<Product>> _relatedProducts;
  final authService = AuthService();
  bool isAddingToCart = false;

  @override
  void initState() {
    super.initState();
    _imageController = PageController();
    _relatedProducts = fetchRelatedProducts();
  }

  @override
  void dispose() {
    _imageController.dispose();
    super.dispose();
  }

  Future<List<Product>> fetchRelatedProducts() async {
    try {
      final response = await http
          .get(
            ApiConfig.uri(
              'products',
              queryParameters: {
                'category': widget.product.category ?? '',
                'limit': '10',
              },
            ),
            headers: {'Content-Type': 'application/json'},
          )
          .timeout(const Duration(seconds: 60));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final List<dynamic> products = data['products'] ?? [];
        // Filter out current product
        return products
            .map((p) => Product.fromJson(p))
            .where((p) => p.id != widget.product.id)
            .take(6)
            .toList();
      }
      return [];
    } catch (e) {
      developer.log(
        '[PRODUCT] Error fetching related products: $e',
        name: 'ProductDetail',
      );
      return [];
    }
  }

  Future<void> addToCart() async {
    if (isAddingToCart) return;

    setState(() {
      isAddingToCart = true;
    });

    try {
      final token = await authService.getToken();
      if (!mounted) return;
      if (token == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Please log in to add items to cart'),
            behavior: SnackBarBehavior.floating,
            margin: const EdgeInsets.fromLTRB(16, 16, 16, 0),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            backgroundColor: Colors.red,
          ),
        );
        if (mounted) setState(() => isAddingToCart = false);
        return;
      }

      final response = await http
          .post(
            ApiConfig.uri('customer/cart'),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $token',
            },
            body: jsonEncode({
              'id': widget.product.id,
              'name': widget.product.name,
              'price': widget.product.price,
              'image': widget.product.images.isNotEmpty
                  ? widget.product.images[0]
                  : '',
              'category': widget.product.category,
              'qty': 1,
            }),
          )
          .timeout(const Duration(seconds: 60));

      developer.log(
        '[PRODUCT] Add to cart response: ${response.statusCode}',
        name: 'ProductDetail',
      );

      if (mounted) {
        if (response.statusCode == 200) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('${widget.product.name} added to cart ✓'),
              behavior: SnackBarBehavior.floating,
              margin: const EdgeInsets.fromLTRB(16, 16, 16, 0),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              backgroundColor: const Color(0xFFd4af37),
              duration: const Duration(seconds: 2),
            ),
          );
          // Pop back to shop screen to show updated cart
          Navigator.pop(
            context,
            true,
          ); // Return true to indicate item was added
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Failed to add to cart: ${response.statusCode}'),
              behavior: SnackBarBehavior.floating,
              margin: const EdgeInsets.fromLTRB(16, 16, 16, 0),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              backgroundColor: Colors.red,
            ),
          );
        }
        setState(() => isAddingToCart = false);
      }
    } catch (e) {
      developer.log(
        '[PRODUCT] Error adding to cart: $e',
        name: 'ProductDetail',
      );
      if (!mounted) return;
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: $e'),
            behavior: SnackBarBehavior.floating,
            margin: const EdgeInsets.fromLTRB(16, 16, 16, 0),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            backgroundColor: Colors.red,
          ),
        );
        setState(() => isAddingToCart = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isOutOfStock =
        widget.product.stock != null && widget.product.stock! <= 0;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Product Details'),
        backgroundColor: const Color(0xFFd4af37),
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Product Image Carousel
            Container(
              color: Colors.grey[200],
              height: 320,
              child: Stack(
                children: [
                  PageView.builder(
                    controller: _imageController,
                    onPageChanged: (index) {
                      setState(() {
                        _currentImageIndex = index;
                      });
                    },
                    itemCount: widget.product.images.length,
                    itemBuilder: (context, index) {
                      final imageUrl = widget.product.images[index];
                      return imageUrl.isNotEmpty
                          ? Image.network(
                              imageUrl,
                              fit: BoxFit.cover,
                              errorBuilder: (context, error, stackTrace) {
                                return Container(
                                  color: const Color.fromRGBO(
                                    212,
                                    175,
                                    55,
                                    0.1,
                                  ),
                                  child: const Icon(
                                    Icons.diamond,
                                    size: 80,
                                    color: Color(0xFFd4af37),
                                  ),
                                );
                              },
                            )
                          : Container(
                              color: const Color.fromRGBO(212, 175, 55, 0.1),
                              child: const Icon(
                                Icons.diamond,
                                size: 80,
                                color: Color(0xFFd4af37),
                              ),
                            );
                    },
                  ),
                  // Image Counter
                  if (widget.product.images.length > 1)
                    Positioned(
                      bottom: 16,
                      right: 16,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.black87,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          '${_currentImageIndex + 1}/${widget.product.images.length}',
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
            // Product Info
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Category
                  if (widget.product.category != null)
                    Text(
                      widget.product.category!.toUpperCase(),
                      style: const TextStyle(
                        fontSize: 12,
                        color: Colors.grey,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 1,
                      ),
                    ),
                  const SizedBox(height: 8),
                  // Product Name
                  Text(
                    widget.product.name,
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 12),
                  // Rating
                  if (widget.product.rating != null)
                    Row(
                      children: [
                        ...List.generate(
                          5,
                          (i) => Icon(
                            i < widget.product.rating!.toInt()
                                ? Icons.star
                                : Icons.star_border,
                            size: 16,
                            color: const Color(0xFFd4af37),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          '${widget.product.rating} (${widget.product.reviews ?? 0} reviews)',
                          style: const TextStyle(
                            fontSize: 14,
                            color: Colors.grey,
                          ),
                        ),
                      ],
                    ),
                  const SizedBox(height: 16),
                  // Price
                  Text(
                    '\$${widget.product.price.toStringAsFixed(2)}',
                    style: const TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFFd4af37),
                    ),
                  ),
                  const SizedBox(height: 16),
                  // Stock Status
                  Text(
                    isOutOfStock
                        ? 'Out of Stock'
                        : 'In Stock (${widget.product.stock} available)',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: isOutOfStock ? Colors.red : Colors.green,
                    ),
                  ),
                  const SizedBox(height: 20),
                  // Description
                  if (widget.product.description != null)
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Description',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          widget.product.description!,
                          style: const TextStyle(
                            fontSize: 14,
                            color: Colors.grey,
                            height: 1.5,
                          ),
                        ),
                      ],
                    ),
                  const SizedBox(height: 24),
                  // Add to Cart Button
                  SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: ElevatedButton(
                      onPressed: isOutOfStock || isAddingToCart
                          ? null
                          : addToCart,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFd4af37),
                        disabledBackgroundColor: Colors.grey,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                      child: Text(
                        isAddingToCart
                            ? 'Adding...'
                            : isOutOfStock
                            ? 'Out of Stock'
                            : 'Add to Cart',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            // Related Products
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Related Products',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 12),
                  FutureBuilder<List<Product>>(
                    future: _relatedProducts,
                    builder: (context, snapshot) {
                      if (snapshot.connectionState == ConnectionState.waiting) {
                        return const SizedBox(
                          height: 200,
                          child: Center(
                            child: CircularProgressIndicator(
                              color: Color(0xFFd4af37),
                            ),
                          ),
                        );
                      }

                      if (snapshot.hasError ||
                          !snapshot.hasData ||
                          snapshot.data!.isEmpty) {
                        return const Padding(
                          padding: EdgeInsets.symmetric(vertical: 16),
                          child: Text('No related products available'),
                        );
                      }

                      final relatedProducts = snapshot.data!;
                      return SizedBox(
                        height: 200,
                        child: ListView.builder(
                          scrollDirection: Axis.horizontal,
                          itemCount: relatedProducts.length,
                          itemBuilder: (context, index) {
                            final product = relatedProducts[index];
                            final imageUrl =
                                product.images.isNotEmpty &&
                                    product.images.first.isNotEmpty
                                ? product.images.first
                                : null;

                            return GestureDetector(
                              onTap: () {
                                Navigator.of(context).pushReplacement(
                                  MaterialPageRoute(
                                    builder: (context) =>
                                        ProductDetailScreen(product: product),
                                  ),
                                );
                              },
                              child: Container(
                                width: 140,
                                margin: const EdgeInsets.only(right: 12),
                                child: Card(
                                  elevation: 2,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: ClipRRect(
                                    borderRadius: BorderRadius.circular(10),
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Container(
                                          height: 100,
                                          width: double.infinity,
                                          color: Colors.grey[200],
                                          child: imageUrl != null
                                              ? Image.network(
                                                  imageUrl,
                                                  fit: BoxFit.cover,
                                                  errorBuilder:
                                                      (
                                                        context,
                                                        error,
                                                        stackTrace,
                                                      ) {
                                                        return Container(
                                                          color:
                                                              const Color.fromRGBO(
                                                                212,
                                                                175,
                                                                55,
                                                                0.1,
                                                              ),
                                                          child: const Icon(
                                                            Icons.diamond,
                                                            size: 30,
                                                            color: Color(
                                                              0xFFd4af37,
                                                            ),
                                                          ),
                                                        );
                                                      },
                                                )
                                              : Container(
                                                  color: const Color.fromRGBO(
                                                    212,
                                                    175,
                                                    55,
                                                    0.1,
                                                  ),
                                                  child: const Icon(
                                                    Icons.diamond,
                                                    size: 30,
                                                    color: Color(0xFFd4af37),
                                                  ),
                                                ),
                                        ),
                                        Expanded(
                                          child: Padding(
                                            padding: const EdgeInsets.all(6),
                                            child: Column(
                                              crossAxisAlignment:
                                                  CrossAxisAlignment.start,
                                              mainAxisSize: MainAxisSize.min,
                                              children: [
                                                Text(
                                                  product.name,
                                                  style: const TextStyle(
                                                    fontWeight: FontWeight.bold,
                                                    fontSize: 11,
                                                  ),
                                                  maxLines: 1,
                                                  overflow:
                                                      TextOverflow.ellipsis,
                                                ),
                                                const Spacer(),
                                                Text(
                                                  '\$${product.price.toStringAsFixed(2)}',
                                                  style: const TextStyle(
                                                    color: Color(0xFFd4af37),
                                                    fontWeight: FontWeight.bold,
                                                    fontSize: 11,
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                            );
                          },
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }
}
