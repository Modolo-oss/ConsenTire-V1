name := "consentire-metagraph"

version := "1.0.0"

scalaVersion := "2.13.12"

// Constellation Tessellation dependencies
libraryDependencies ++= Seq(
  // Core Tessellation
  "org.tessellation" %% "tessellation-currency-l0" % "2.9.0",
  "org.tessellation" %% "tessellation-currency-l1" % "2.9.0",
  "org.tessellation" %% "tessellation-sdk" % "2.9.0",
  
  // Circe for JSON
  "io.circe" %% "circe-core" % "0.14.6",
  "io.circe" %% "circe-generic" % "0.14.6",
  "io.circe" %% "circe-parser" % "0.14.6",
  
  // Cats Effect
  "org.typelevel" %% "cats-effect" % "3.5.2",
  "org.typelevel" %% "cats-core" % "2.10.0",
  
  // Refined types
  "eu.timepit" %% "refined" % "0.11.0",
  
  // Testing
  "org.scalatest" %% "scalatest" % "3.2.16" % Test,
  "org.scalamock" %% "scalamock" % "5.2.0" % Test
)

// Resolvers for Constellation artifacts
resolvers ++= Seq(
  "Constellation Releases" at "https://maven.pkg.github.com/Constellation-Labs/tessellation",
  "Sonatype OSS Snapshots" at "https://oss.sonatype.org/content/repositories/snapshots"
)

scalacOptions ++= Seq(
  "-deprecation",
  "-feature",
  "-unchecked",
  "-Xlint",
  "-Ywarn-dead-code",
  "-Ywarn-unused",
  "-language:higherKinds",
  "-language:postfixOps"
)

// Assembly settings for JAR creation
assembly / assemblyMergeStrategy := {
  case "META-INF/MANIFEST.MF" => MergeStrategy.discard
  case "META-INF/BC1024KE.RSA" => MergeStrategy.discard
  case "META-INF/BC2048KE.RSA" => MergeStrategy.discard
  case PathList("META-INF", xs @ _*) => MergeStrategy.discard
  case "reference.conf" => MergeStrategy.concat
  case _ => MergeStrategy.first
}

assembly / assemblyJarName := "consentire-metagraph.jar"
