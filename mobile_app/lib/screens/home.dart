import 'package:flutter/material.dart';
import 'package:mobile_app/widgets/explorer.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Explorer(),
    );
  }
}
