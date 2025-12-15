import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'screens/home.dart';
import 'screens/profile.dart';
import 'package:get_it/get_it.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await dotenv.load(fileName: '.env');
  await Supabase.initialize(
    url: dotenv.env['SUPABASE_URL']!,
    anonKey: dotenv.env['SUPABASE_ANON_KEY']!,
  );

  runApp(ProviderScope(child: const MyApp()));
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  // This widget is the root of your application.
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Flutter Demo',
      theme: ThemeData(
        // This is the theme of your application.
        //
        // TRY THIS: Try running your application with "flutter run". You'll see
        // the application has a purple toolbar. Then, without quitting the app,
        // try changing the seedColor in the colorScheme below to Colors.green
        // and then invoke "hot reload" (save your changes or press the "hot
        // reload" button in a Flutter-supported IDE, or press "r" if you used
        // the command line to start the app).
        //
        // Notice that the counter didn't reset back to zero; the application
        // state is not lost during the reload. To reset the state, use hot
        // restart instead.
        //
        // This works for code too, not just values: Most code changes can be
        // tested with just a hot reload.
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.black12),
      ),
      home: const BottomTabsLayout(),
    );
  }
}

class BottomTabsLayout extends StatefulWidget {
  const BottomTabsLayout({super.key});

  @override
  State<BottomTabsLayout> createState() => _BottomTabsLayoutState();
}

class _BottomTabsLayoutState extends State<BottomTabsLayout> {
  int _currentIndex = 0;

  late final _tabs = [
    TabItem(
      title: 'Главная',
      icon: Icons.home_outlined,
      selectedIcon: Icons.home,
      content: const HomeScreen(),
    ),
    const TabItem(
      title: 'Профиль',
      icon: Icons.person_outline,
      selectedIcon: Icons.person,
      content: ProfileScreen(),
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      // appBar: AppBar(
      //   title: Text(_tabs[_currentIndex].title),
      // ),
      body: IndexedStack(
        index: _currentIndex,
        children: _tabs.map((tab) => tab.content).toList(),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (index) => setState(() {
          _currentIndex = index;
        }),
        destinations: _tabs
            .map(
              (tab) => NavigationDestination(
                icon: Icon(tab.icon),
                selectedIcon: Icon(tab.selectedIcon),
                label: tab.title,
              ),
            )
            .toList(),
      ),
    );
  }
}

class TabItem {
  const TabItem({
    required this.title,
    required this.icon,
    required this.selectedIcon,
    required this.content,
  });

  final String title;
  final IconData icon;
  final IconData selectedIcon;
  final Widget content;
}


void configureDI() {
  final getIt = GetIt.instance;
}